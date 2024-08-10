import { App, Editor, MarkdownView, Modal, Notice, Plugin, Vault, TFile, TAbstractFile, PluginSettingTab, Setting, HeadingCache, EventRef, MarkdownFileInfo, getLinkpath, Platform } from 'obsidian';
// import {
// 	debugLog, path, ConvertImage
// } from './utils';
// import { renderTemplate } from 'template'; 
import { randomInt } from 'crypto';
import { dir, time } from 'console';
import { path } from 'src/utils';
import { PasteSettingsTab } from './settings';
// import * as path from 'path';
// Remember to rename these classes and interfaces!
// const PASTED_IMAGE_PREFIX = 'Pasted image '
// interface ImageCPPluginSettings {
// 	mySetting: string;
// }
const reg1: RegExp = /!\[\[(.*?)\]\]/
/*
------------- Cmd + Opt+ I on macOS or Ctrl + Shift + I on Windows or Linux.
*/

interface PluginSettings {
	IsShowCustomPath: boolean
	PasteImageOption: string
	CustomPath: string
	IsEscapeUriPath: boolean
	IsRelativePath: boolean
	IsAddRelativePath: boolean
	IsApplyLocalImage: boolean
	IsApplyNetworklImage: boolean

	// {{imageNameKey}}-{{DATE:YYYYMMDD}}
	defaultSetting: string
	imageNamePattern: string
	dupNumberAtStart: boolean
	dupNumberDelimiter: string
	dupNumberAlways: boolean
	autoRename: boolean
	handleAllAttachments: boolean
	excludeExtensionPattern: string
	disableRenameNotice: boolean
}

const DEFAULT_SETTINGS: PluginSettings = {
	defaultSetting: 'default',
	imageNamePattern: '{{fileName}}',
	dupNumberAtStart: false,
	dupNumberDelimiter: '-',
	dupNumberAlways: false,
	autoRename: false,
	handleAllAttachments: false,
	excludeExtensionPattern: '',
	disableRenameNotice: false,
	IsShowCustomPath: false,
	PasteImageOption: 'default',
	CustomPath: './',
	IsEscapeUriPath: true,
	IsAddRelativePath: true,
	IsApplyLocalImage: true,
	IsApplyNetworklImage: true,
	IsRelativePath: false
}

const IMAGE_EXTENTION_NAMES = ["image/apng", "image/avif", "image/bmp", "image/gif", "image/x-icon", "image/jpeg", "image/png", "image/svg+xml", "image/tiff", "image/webp", "image/xbm, image-xbitmap"]

const IMAGE_EXTS = [
	'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
]

type PasteImageType = "local" | "network" | "nai" // nai means not a image    local： 本地图片辅助粘贴和截图的

type PasteImageInfo = {
	type: PasteImageType;
	filename: string;
	// alt: string;
	// extension: string;
}

type InsertText = {
	src: string;
	dst: string;
}



export default class ImageCPPlugin extends Plugin {
	writeOptions(arg0: string) {
		// this.saveSettings()
		// console.log(arg0)
	}
	public toggle: true;
	// public settings	: ISettings;
	public settings: PluginSettings;
	public imageNameList: PasteImageInfo[];
	private insertTextList: InsertText[] = [];
	private imageIndex = 0;
	private researchFromImageSrc: RegExp;
	private MDTFile: TFile;
	// imageFileNames: any;
	async onload() {

		await this.loadSettings();
		if (Platform.isWin) {
			this.researchFromImageSrc = /<img src="(.*?)" alt="(.*?)"\/><|<img src="(.*?)"\/></
		} else if (Platform.isMacOS) { // || Platform.isLinux
			this.researchFromImageSrc = /<img src="(.*?)"\/>$/
		}
		// this.imageFileNames = []

		this.addCommand({
			id: "re-construt-image",
			name: "reconstrut-image: Make images placed using standard markdown syntax, Be sure to back up your files before performing this operation",
			editorCallback: async (editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {

				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);

				// 
				if (markdownView) {
					await this.resolveAllImageInMD()
					return true;
				}
			}
		});


		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new PasteSettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.


		this.registerEvent(

			this.app.vault.on('create', (file) => {
				// console.log("----create file---", this.imageNameList)
				// debugLog('file created', file)
				if (!(file instanceof TFile)) return
				const timeGapMs = (new Date().getTime()) - file.stat.ctime
				// if the file is created more than 1 second ago, the event is most likely be fired on vault initialization when starting Obsidian app, ignore it
				if (timeGapMs > 1000) return
				// always ignore markdown file creation
				if (isMarkdownFile(file)) return
				if (file instanceof TFile) {
					if (this.imageNameList == null || this.imageNameList.length === 0) {
						// page other file, not image
						return
					} else if (this.imageNameList.length === 1 && this.imageNameList[0].type === "network") {
						console.log("----------------------", this.imageNameList[0], file.basename, file.name, file.path)
						this.pasteOneImage2MDDir(this.imageNameList[0], file)
					}
					else if (this.imageNameList.length >= 1 && this.imageNameList[this.imageIndex].type != "nai") { // copy file
						let image = this.imageNameList[this.imageIndex]
						// console.log("filenames:::", image)
						this.pasteMultipleImage2MDDir(image, file)
						this.imageIndex++
					}
				}
			})
		)

		this.registerEvent(this.app.workspace.on('editor-paste', this.customPasteEventCallback))

	}

	// get a image link with a standard markdown syntax.
	// examplle:
	// input: (MdFile, "test.jpg")  
	// output:    [ "MDFile.filename/test.jpg", "![test](MDFIle.filename/test.jpg)"]
	async getRenameFilePath(mdFile: TFile, filename: string): Promise<[string, string]> {
		// const setDir: string;
		let dirPath: string;

		switch (this.settings.PasteImageOption) {
			// case "default":

			// 	break;
			case "current":
				dirPath = "/";
				break;
			case "toassets":
				dirPath = mdFile.parent?.path ? path.join(mdFile.parent!.path, ".assets") : mdFile.basename;
				// dirPath += ".assets"
				// dirPath = "./assets";
				break;
			case "tofilenameassests":
				dirPath = mdFile.parent?.path ? path.join(mdFile.parent!.path, mdFile.basename) : mdFile.basename;
				dirPath += ".assets"
				break;
			case "tocustom":
				let replacePath: string;
				if (this.settings.CustomPath.contains("${filename}")) {
					replacePath = this.settings.CustomPath.replace(/\$\{filename\}/g, mdFile.basename)
				} else if (this.settings.CustomPath.contains("${filepath}")) {
					replacePath = this.settings.CustomPath.replace(/\$\{filepath\}/g, mdFile.basename)
				} else {
					replacePath = this.settings.CustomPath;
				}
				if (this.settings.CustomPath.startsWith("./")) { 
					dirPath = mdFile.parent?.path ? path.join(mdFile.parent!.path, replacePath) : replacePath;
				} else {
					dirPath = replacePath;
				}
				break;
				
				// // if (this.settings.CustomPath.startsWith("./")) {

				// 	// const filenameDirPath = mdFile.parent?.path ? path.join(mdFile.parent!.path, mdFile.basename) : mdFile.basename;
				// 	if (this.settings.CustomPath.contains("${filename}")) {
				// 		const relativeCustomPath = this.settings.CustomPath.replace(/\$\{filename\}/g, mdFile.basename)
				// 		dirPath = mdFile.parent?.path ? path.join(mdFile.parent!.path, relativeCustomPath) : relativeCustomPath;
				// 		// dirPath = this.settings.CustomPath.replace(/\$\{filename\}/g, mdFile.basename)
				// 	}
				// 	else if (this.settings.CustomPath.contains("${filepath}")) {
				// 		// extract   'articles/col1/article'  from  'articles/col1/article.md'
				// 		const relativeCustomPath = this.settings.CustomPath.replace(/\$\{filepath\}/g, mdFile.basename)
				// 		dirPath = mdFile.parent?.path ? path.join(mdFile.parent!.path, relativeCustomPath) : relativeCustomPath;
				// 	}
				// 	else {

				// 		dirPath = mdFile.parent?.path ? path.join(mdFile.parent!.path, this.settings.CustomPath) : this.settings.CustomPath;
				// 	}
				// // } else {
				// 	// console.log("mdpathpp:", mdFile.path)
				// 	// const path = mdFile.path.substring(0, mdFile.path.length - mdFile.extension.length - 1)
				// 	dirPath = this.settings.CustomPath.replace(/\$\{filepath\}/g, mdFile.basename);
				// // }
				// break;
			default:
				dirPath = mdFile.parent?.path ? path.join(mdFile.parent!.path, mdFile.basename) : mdFile.basename;
		}
		console.log(mdFile.parent?.path, mdFile.basename, dirPath)
		// const dirPath1 = mdFile.parent?.path ? path.join(mdFile.parent!.path, mdFile.basename) : mdFile.basename
		// console.log("isExist", dirPath)
		if (this.settings.PasteImageOption != "current" && !await this.app.vault.adapter.exists(dirPath)) {
			// try create 同名文件夹
			console.log("not exist, will create")
			await this.app.vault.createFolder(dirPath)
		}

		let newImagePath = path.join(dirPath, filename);
		let newFilename = filename
		// 2. 同名文件是否存在
		if (await this.app.vault.adapter.exists(newImagePath)) {
			// console.log("Exist:", newImagePath, )
			newFilename = filename.substring(0, filename.lastIndexOf(".")) + "-" + getFormatNow() + filename.substring(filename.lastIndexOf("."))
			newImagePath = path.join(dirPath, newFilename)
		}


		// const IsAddRelativePath =  this.settings.IsAddRelativePath ? "./" : "" ;
		const IsAddRelativePath = this.settings.IsAddRelativePath ? "" : "";

		if(this.settings.CustomPath.startsWith("./") && dirPath.includes("/")){
			let tmpDirPath : string;
			let names = [];
			names = dirPath.split("/");
			if(names.length >= 1){
				tmpDirPath = "./" + names[names.length-1] + "/" + newFilename;
				dirPath = tmpDirPath;
			}
		}

		let linkName :string;
		if(this.settings.IsAddRelativePath){
			linkName = this.settings.IsEscapeUriPath ? encodeURI(dirPath) : dirPath
		}else{
			linkName = this.settings.IsEscapeUriPath ? encodeURI(path.join(dirPath, newFilename)) : path.join(dirPath, newFilename)
		}


		const newLinkText = "![" + newFilename + "](" + IsAddRelativePath + linkName + ")"
		console.log("new:", this.settings.IsAddRelativePath, IsAddRelativePath, newLinkText, linkName)
		return [newImagePath, newLinkText]
	}


	async pasteOneImage2MDDir(pasteImageInfo: PasteImageInfo | undefined, image: TFile) {
		// console.log("run---------", pasteImageInfo, this.MDTFile)
		if (!pasteImageInfo || !this.MDTFile) return;
		// const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		// const file = view?.file
		// debugLog('active file', file?.path)
		// throw new Error('Method not implemented.');
		// this.app.vault.adapter.exists()
		// this.app.vault.adapter.write()
		// this.app.fileManager.renameFile()
		// 1. 同名文件夹是否存在

		const [newImagePath, newLinkText] = await this.getRenameFilePath(this.MDTFile, pasteImageInfo.filename)

		// const dirPath = this.MDTFile.parent?.path ? path.join(this.MDTFile.parent.path, this.MDTFile.basename) : this.MDTFile.basename
		// // console.log("isExist", dirPath)
		// if (!await this.app.vault.adapter.exists(dirPath)) {
		// 	// try create 同名文件夹
		// 	console.log("not exist, will create")
		// 	await this.app.vault.createFolder(dirPath)
		// }
		// console.log(pasteImageInfo)

		// // TODO本地or网络
		// // console.log("CURRENT IMAGE：");
		// const filename = pasteImageInfo.filename
		// let newImagePath = path.join(dirPath, filename);
		// // 2. 同名文件是否存在
		// if (await this.app.vault.adapter.exists(newImagePath)) {
		// 	newImagePath = path.join(dirPath, filename.substring(0, filename.lastIndexOf(".")) + "-" + getFormatNow() + filename.substring(filename.lastIndexOf(".")))
		// }
		// console.log("newPath", newImagePath)


		// 3. 手动更改文件名 ?? 这句话的作用是？
		// const srcLinkText = this.app.fileManager.generateMarkdownLink(image, path.join(dirPath, filename))
		// ![](AAA测试插件/xinxiu@240.png)
		// console.log(filename, this.MDTFile.basename, filename)
		// const newLinkText = "![" + filename + "](" + encodeURI(path.join(this.MDTFile.basename, filename)) + ")"
		// // console.log(srcLinkText, newLinkText)

		// in case fileManager.renameFile may not update the internal link in the active file,
		// we manually replace by manipulating the editor

		const sourcePath: string = this.getActiveFile()!.path
		const editor = this.getActiveEditor(sourcePath);
		if (!editor) {
			new Notice(`Failed to rename ${sourcePath}: no active editor`)
			return
		}

		// 

		const cursor = editor.getCursor()
		const line = editor.getLine(cursor.line)
		// console.log(line.substring(0, cursor.ch))
		const imageOriNameLength = line.substring(0, cursor.ch).endsWith("]]") ? image.name.length + 5 : encodeURI(image.name).toString().length + 5;
		// if (line.endsWith("]]")) {
		// const imageOriNameLength = image.name.length + 5;

		// }
		//  const imageOriNameLength = new URL(image.name).toString().length
		console.log(cursor.ch, line, line.length, newLinkText.length, imageOriNameLength, image.name, image.name.length + 5, encodeURI(image.name).toString().length + 5)
		await this.app.vault.rename(image, newImagePath)
		// editor.replaceRange(newLinkText, { ...cursor, ch: line.length - imageOriNameLength  }, { ...cursor, ch: line.length })//- imageOriNameLength + newLinkText.length })
		editor.replaceRange(newLinkText, { ...cursor, ch: cursor.ch - imageOriNameLength }, { ...cursor, ch: cursor.ch })//- imageOriNameLength + newLinkText.length })

	}


	async pasteMultipleImage2MDDir(pasteImageInfo: PasteImageInfo | undefined, image: TFile) {
		// console.log("run---------", pasteImageInfo, this.MDTFile)

		if (!pasteImageInfo || !this.MDTFile) return;

		// 1. 同名文件夹是否存在
		const dirPath = this.MDTFile.parent?.path ? path.join(this.MDTFile.parent.path, this.MDTFile.basename) : this.MDTFile.basename

		const filename = pasteImageInfo.filename

		// 3. 手动更改文件名
		const srcLinkText = this.app.fileManager.generateMarkdownLink(image, path.join(dirPath, filename))
		// ![](AAA测试插件/xinxiu@240.png)
		// console.log(filename, this.MDTFile.basename, filename)
		// const newLinkText = "![" + filename + "](" + encodeURI(path.join(this.MDTFile.basename, filename)) + ")"
		// console.log(srcLinkText, newLinkText)

		const [newImagePath, newLinkText] = await this.getRenameFilePath(this.MDTFile, pasteImageInfo.filename)

		// in case fileManager.renameFile may not update the internal link in the active file,
		// we manually replace by manipulating the editor

		const sourcePath: string = this.getActiveFile()!.path
		const editor = this.getActiveEditor(sourcePath);
		if (!editor) {
			new Notice(`Failed to rename ${sourcePath}: no active editor`)
			return
		}

		// 


		this.app.vault.rename(image, newImagePath)

		if (this.insertTextList.length === this.imageNameList.length - 1) {

			const cursor = editor.getCursor()
			const line = editor.getLine(cursor.line)
			// console.log('current line', line, cursor, editor.getCursor("anchor"), editor.getCursor("from"), editor.getCursor("to"))

			// editor.replaceRange(this.insertTextList.map(e=>e.dst).join("\n"), editor.getCursor())
			const lastStartInsertLine = cursor.line - (this.imageNameList.length - 1) * 2
			const lastStartInsertLineContent = editor.getLine(lastStartInsertLine)
			var sp = { line: 0, ch: 0 };
			// console.log("--", this.insertTextList)
			if (this.insertTextList.length != 0) {
				// 复制了多个图片
				if (lastStartInsertLineContent === this.insertTextList[0].src) {
					sp = { line: lastStartInsertLine, ch: 0 }
				} else if (lastStartInsertLineContent.endsWith(this.insertTextList[0].src) && lastStartInsertLineContent.length >= this.insertTextList[0].src.length) {
					sp = { line: lastStartInsertLine, ch: lastStartInsertLineContent.length - this.insertTextList[0].src.length }
				}
				var content = this.insertTextList.map(x => x.dst).join("\n\n") + "\n\n" + newLinkText + "\n"

			} else {
				// 复制了一个图片
				sp.ch = cursor.ch - srcLinkText.length
				sp.line = cursor.line
				var content = newLinkText
			}
			console.log(cursor.ch, cursor.line, line, srcLinkText, newImagePath,)


			editor.replaceRange(content, { line: sp.line, ch: sp.ch }, cursor)//, {line:cursor.line, ch:this.insertTextList.last()!.dst.length})

			// 批量插入，从本地粘贴一堆图片时，在处理最后一个图片处理时再批量插入images的链接到md文件中。
			// this.insertTextList.forEach(ele => {
			// 	console.log("insert text---:", ele.dst, editor.getCursor())
			// 	editor.replaceSelection(ele.dst)
			// });
			// for (var i=0; i<this.insertTextList.length; i++) {

			// }
			// console.log("[lineNumber]", content, cursor)
			// editor.replaceRange(content)
			// editor.undo()// !!!!!!!!!!!!!太他妈关键了！
			// 不好用，莫名其妙会写到系统自动写的前面去
			// editor.replaceSelection(content)


		} else {
			// console.log("will insert:", srcLinkText, "--->", newLinkText)
			this.insertTextList.push({ src: srcLinkText, dst: newLinkText })
		}
		//TODO 清理无链接图片的功能！！！
		// editor.transaction({
		// 	changes: [
		// 		{
		// 			from: { ...cursor, ch: 0 },
		// 			to: { ...cursor, ch: line.length },
		// 			text: line.replace(srcLinkText, newLinkText),
		// 		}
		// 	]
		// })
		// this.app.fileManager.renameFile(image, newImagePath)
	}


	private customPasteEventCallback = async (
		evt: ClipboardEvent,
		editor: Editor,
		markdownView: MarkdownView,
	) => {

		// console.log(editor, markdownView.file, evt,)  // md file.
		// console.log(evt.clipboardData?.files)  //
		// console.log(evt.clipboardData?.types) // ['Files', '']
		// console.log(evt.clipboardData?.items.length, evt.clipboardData?.items[0], evt.clipboardData?.items[1])
		this.imageNameList = []
		this.insertTextList = []

		this.imageIndex = 0
		const t_types = evt.clipboardData?.types
		if (t_types?.length == 1 && t_types[0] === "text/plain") {
			// 粘贴文字。。。
			return;
		}


		this.MDTFile = markdownView.file!
		// console.log("MDFILE", this.MDTFile)
		if (t_types?.length == 2 && t_types[0] === "text/html" && t_types[1] === "Files") {
			// 粘贴一个网络图片
			const items = evt.clipboardData?.items
			if (items?.length == 2 && items![1].kind == "file" && items![1].type.startsWith("image/")) {
				let extension = items![1].type.split("/")[1]
				// console.log(extension, items![1].type)
				items[0].getAsString(s => {
					// console.log("raw image name", s)
					let imageName;
					const result = s.match(this.researchFromImageSrc)
					if (result) {
						let filename: string;
						if (result.length === 2) { // macos/linux
							filename = result[1]
						} else if (result.length == 4 && result[1] && result[2]) { // win32 匹配src和alt括号
							// 暂时不使用alt名字：比如 `<html>
							// <body>
							// <!--StartFragment--><img src="https://csdnimg.cn/release/blogv2/dist/pc/img/btnGuideSide1.gif" alt="创作活动"/><!--EndFragment-->
							// </body>
							// </html>`
							filename = result[1]
						} else {// win32 匹配最后一个括号
							filename = result[3]
						}
						const url = new URL(filename)
						imageName = url.pathname.split("/").last()
						if (!imageName?.endsWith(extension)) {
							imageName += `.${extension}`
							// this.imageNameList.push(imageName ) 规范写法！
						} else {
							// console.log(s);
							new Notice("解析图片名失败，使用随机名")
						}

					}
					this.imageNameList.push({
						type: "network",
						filename: imageName || `image-${getFormatNow()}.${extension}`
					})

				})
			}
		} else if (t_types?.length == 1 && t_types[0] === "Files") {
			if (!evt.clipboardData?.files) return // 
			const files = evt.clipboardData!.files;
			for (var i = 0; i < files.length; i += 1) {
				if (files[i].type.startsWith("image/") && files[i].name.length > 0) {
					let extension = files[i].type.split("/")[1]
					this.imageNameList.push({
						type: 'local',
						filename: files[i].name === "image.png" ? "image-" + getFormatNow() + "." + extension : files[i].name
					})
				} else {
					this.imageNameList.push({ type: 'nai', filename: "" }) // 
				}
			}


		}
		// this.imageNameList.reverse()
		// console.log("---:", this.imageNameList)
		// console.log(evt, this, markdownView, )
		// evt.preventDefault();
	}



	async resolveAllImageInMD() {

		const mdFile = this.app.workspace.getActiveFile();
		// const oldText = this.app.workspace.activeEditor()getValue();
		// console.log(ctx.file, file, ctx.file === file) // true
		// const oldText = stripCr(await this.app.vault.read(mdFile!));
		const editor = this.getActiveEditor(mdFile!.path);
		if (!editor || !mdFile) return
		// console.log(mdFile)
		const fileCache = this.app.metadataCache.getFileCache(mdFile!)
		// const deDuplicateMap: Map<string, string> = new Map() //
		if (!fileCache?.embeds?.length) return
		// for (var i=fileCache?.embeds?.length-1; i>=0; i++) {
		// 	var embed = fileCache.embeds[i]
		// }
		// fileCache.embeds.reverse().reduce(()=> {

		// })
		const embeds = []
		for (var i = fileCache.embeds.length - 1; i >= 0; i--) {
			const e = fileCache.embeds[i]
			embeds.push({
				link: e.link,
				sline: e.position.start.line,
				sch: e.position.start.col,
				eline: e.position.end.line,
				ech: e.position.end.col,
				origin: e.original,
			})
		}
		// console.log(fileCache.embeds, embeds)

		for (var i = 0; i < embeds.length; i++) {
			const embed = embeds[i]
			if (!reg1.test(embed.origin) || !isImageWithLink(embed.link)) {
				console.log("不用迁移: ", embed.origin, reg1.test(embed.origin));
				continue;
			}

			const linkRename = embed.link.split(" ").join("-") // "Pasted image 20230613094411.png" ---> "Pasted-image-20230613094411.png"
			const [newImagePath, newLinkText] = await this.getRenameFilePath(mdFile!, linkRename)
			const imgfile = this.app.metadataCache.getFirstLinkpathDest(embed.link, mdFile!.path)
			if (!imgfile) {
				// console.log("文件不存在:", embed.origin); 
				// return
			} else {
				await this.app.vault.rename(imgfile, newImagePath)
			}

			// console.log("INNFO]", imgfile, newImagePath, newLinkText)

			editor.replaceRange(newLinkText,
				{ line: embed.sline, ch: embed.sch },
				{ line: embed.eline, ch: embed.ech },
			)
			// editor.transaction({
			// 	changes: [
			// 		{
			// 			from: { ...cursor, ch: 0 },
			// 			to: { ...cursor, ch: line.length },
			// 			text: line.replace(srcLinkText, newLinkText),
			// 		}
			// 	]
			// })
			// 		this.app.fileManager.renameFile(image, newImagePath)

		}

		new Notice("Resolve Images Link Completed")


	}


	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		// this.imageFileNames = Object.assign([],)

	}

	async saveSettings() {
		await this.saveData(this.settings);
	}






	getActiveFile() {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		const file = view?.file
		// this.debuglog1('active file', file?.path)
		return file
	}


	getActiveEditor(sourcePath: string) {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		if (view?.file) {
			if (view.file.path == sourcePath) {
				return view.editor
			}
		}
		return null
	}

}


function getFormatNow() {
	const d = new Date()
	return `${d.getFullYear()}${d.getMonth() + 1}${d.getDate()}${d.getMinutes()}${d.getSeconds()}${d.getMilliseconds()}`
}
function isMarkdownFile(file: TAbstractFile): boolean {
	if (file instanceof TFile) {
		if (file.extension === 'md') {
			return true
		}
	}
	return false
}



function isImageWithLink(link: string): boolean {
	return IMAGE_EXTS.contains(link.split(".").last()!.toLowerCase())
}





// customPasteEventCallback111(evt: ClipboardEvent, editor: Editor, info: MarkdownView | MarkdownFileInfo) {
// 	// throw new Error('Method not implemented.');
// 	new Notice(this.settings.defaultSetting + "fsafslfsfsjl",); //evt.clipboardData, );; ??????无法访问本地变量？
// 	// editor.replaceSelection("--------" + evt);
// 	// editor.replaceSelection("line168-----------" + this.imageFileNames.length.toString());

// 	["---------:",
// 		evt.clipboardData?.types, //   网络图片为：text/html,Files，文字为： text/plain,text/html，粘贴本地是：Files，粘贴表格==粘贴文字
// 		evt.clipboardData?.items.length,  // 粘贴单张本地，为1，粘贴单张网络为2？很神奇
// 		evt.clipboardData?.items[0].type,  // 网络 undefined 本地？
// 		evt.clipboardData?.items[0].getAsFile()?.name,  // 当从本地主复制过去时，能够直接获取到文件名, 粘贴两个时只能显示第一个，所以要根据数量 items[index]
// 		// 单纯网络粘贴时，为空undefined
// 		evt.clipboardData?.items[0].getAsString((s) => { editor.replaceSelection("ss--" + s) }),  // 从网络粘贴时，改行会变成html ,从本地粘贴时，s为空，粘贴txt时这里直接打印txt
// 		/* <html>
// 		  <body>
// 		  <!--StartFragment--><img src="https://p26-passport.byteacctimg.com/img/user-avatar/075d8e781ba84bf64035ac251988fb93~140x140.awebp" alt="avatar"/><!--EndFragment-->
// 		  </body>
// 		  </html> */
// 		evt.clipboardData?.files.length,  // 粘贴图片数量

// 		evt.clipboardData?.files.item(0)?.type,   //  image/jpeg | image/png | .awebp | .awebp ?能识别网络文件类型或本地图片类型
// 		//    evt.clipboardData?.files.item(0) == evt.clipboardData?.items[0].getAsFile()
// 		evt.clipboardData?.files.item(0)?.name, // 网络图片能获取到image.png，和上面差不多， 本地图片能获取到文件名 ！只能靠解析getAsString
// 		// evt.clipboardData?.files.item(0)?.arrayBuffer().then((v)=>editor.replaceSelection(v))
// 		new Date().getTime().toString(),
// 		//    JSON.stringify(info)
// 		// 加上这句，最后就不会粘贴： ![[微信图片_20220516132509 6.jpg]]这个内容了
// 		// evt.preventDefault()
// 	].forEach(element => {
// 		editor.replaceSelection(element?.toString() + "-----END\n ")

// 	});

// 	if (!evt.clipboardData || evt.clipboardData.items.length === 0) {
// 		return
// 	} else {
// 		var files = evt.clipboardData.files
// 		editor.replaceSelection("local-name000-----------" + files.length.toString() + "-" + evt.clipboardData.files.length.toString())

// 		switch (evt.clipboardData.types.toString()) {
// 			case "text/html,Files":
// 				// 党章网络图片
// 				// 网络图片，解析文件名 TODO解析html文件名！
// 				// this.debuglog1("local-name-----------" + t_type) // 因为editor这里无法嵌套别的 editor打印
// 				evt.clipboardData?.items[0].getAsString(s => { this.imageFileNames.push("123" + s) })
// 				editor.replaceSelection("line208-----------" + this.imageFileNames.length.toString())

// 				// files[i]
// 				break;
// 			case "Files":
// 				// 本地图片，原始文件名 可能是多个，也可能是多个，有图片有文件
// 				// this.debuglog1("local-name", items[i].getAsFile.name)
// 				for (let i = 0; i < files.length; i += 1) {
// 					const t_type = files[i].type
// 					// const t_type = items[i].type
// 					if (t_type.startsWith('image') && IMAGE_EXTENTION_NAMES.includes(t_type)) {
// 						editor.replaceSelection("local-name111-----------" + files[i].name)
// 						this.imageFileNames.push(files[i].name)

// 					} else {
// 						this.imageFileNames.push("")
// 					}
// 				}

// 				break;

// 			default: { }

// 		}

// 		editor.replaceSelection("line232-----------" + this.imageFileNames.length)

// 		// 成功逻辑
// 		return
// 	}
// 	this.imageFileNames = []
// 	evt.preventDefault()


// 	return
// }

// allFilesTryGetImages(files: FileList) {
// 	var sum = []

// 	return true
// }





// function getFirstHeading(headings?: HeadingCache[]) {
// 	if (headings && headings.length > 0) {
// 		for (const heading of headings) {
// 			if (heading.level === 1) {
// 				return heading.heading
// 			}
// 		}
// 	}
// 	return ''
// }
// function isPastedImage(file: TAbstractFile): boolean {
// 	if (file instanceof TFile) {
// 		if (file.name.startsWith(PASTED_IMAGE_PREFIX)) {
// 			return true
// 		}
// 	}
// 	return false
// }


// function isImage(file: TAbstractFile): boolean {
// 	if (file instanceof TFile) {
// 		if (IMAGE_EXTS.contains(file.extension.toLowerCase())) {
// 			return true
// 		}
// 	}
// 	return false
// }

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const { contentEl } = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const { contentEl } = this;
// 		contentEl.empty();
// 	}
// }
