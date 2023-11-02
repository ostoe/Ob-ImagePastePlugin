import { App, Editor, MarkdownFileInfo, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile } from 'obsidian';
import { types } from 'util';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

enum PasteImageType {
	LocalImage,
	NetworkImage,
	NotImage
}



// interface PasteImage {
// 	type: PasteImage;
// 	name: string;
// }



const PASTED_IMAGE_PREFIX = 'Pasted image '

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	imageNameList: Object[] = [];
	async customPasteEventCallback1(evt: ClipboardEvent, _: Editor, info: MarkdownView | MarkdownFileInfo) {

		console.log(evt, this, info,)
		// this.settings.mySetting = "default1"
		// console.log(this.settings)
		// 不能访问this.的对象！！！console.log(this.settings.mySetting)
		// editor.replaceSelection(this.settings.mySetting)
		// console.log(this.names.length.toString())

	}

	private customPasteEventCallback = async (
		evt: ClipboardEvent,
		editor: Editor,
		markdownView: MarkdownView,
	) => {
		console.log(evt.clipboardData?.files)
		console.log(evt.clipboardData?.types)
		console.log(evt.clipboardData?.items.length, evt.clipboardData?.items[0], evt.clipboardData?.items[1])
		this.imageNameList = []
		const t_types = evt.clipboardData?.types
		if (t_types?.length == 1 && t_types[0] === "text/plain") {
			// 粘贴文字。。。
			return;

		} else if (t_types?.length == 2 && t_types[0] === "text/html" && t_types[1] === "Files") {
			const items = evt.clipboardData?.items
			if (items?.length == 2 && items![1].kind == "file" && items![1].type.startsWith("image/")) {
				items[0].getAsString(s => {
					const result = s.match(/<img src="(.*?)"\/>$/)
					let imageName;
					if (result && result[1].length > 0) {
						const url = new URL(result[1])
						imageName = url.pathname.split("/").last()
						if (imageName) {
							// this.imageNameList.push(imageName ) 规范写法！
						} else {
							console.log(s);
							new Notice("解析图片名失败，使用随机名")

						}
					}
					// } else {
					// 	// this.imageNameList.push({type: PasteImageType.LocalImage, name: new Date().getTime().toString() + ".jpg"})
					// }
					this.imageNameList.push({type: "network", 
						name: imageName || new Date().getTime().toString() + ".jpg"})

				})
			}
		} else if (t_types?.length == 1 && t_types[0] === "Files") {
			if (!evt.clipboardData?.files) return // 
			const files = evt.clipboardData!.files;
			for (var i = 0; i < files.length; i += 1) {
				if (files[i].type.startsWith("image/") && files[i].name.length > 0) {
					this.imageNameList.push({type: 'local', 
						name: files[i].name})
				} else {
					this.imageNameList.push({type: 'notaimage', name: ""}) // 
				}
			}


		}
		console.log("---:", this.imageNameList)
		// console.log(evt, this, markdownView, )
	}

	async onload() {
		// console.log(this.names)
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});



		this.registerEvent(

			this.app.vault.on('create', (file) => {
				console.log("----create file---", this.imageNameList)
				// debugLog('file created', file)
				if (!(file instanceof TFile)) return
				const timeGapMs = (new Date().getTime()) - file.stat.ctime
				// if the file is created more than 1 second ago, the event is most likely be fired on vault initialization when starting Obsidian app, ignore it
				if (timeGapMs > 1000) return
				// always ignore markdown file creation
				if (isMarkdownFile(file)) return

				if (file instanceof TFile && this.imageNameList.length === 1 
					&& this.imageNameList[0].type != "notaimage") {
					console.log('pasted image created', file, this.settings.mySetting)
					console.log("names:", this.imageNameList)
					// this.startRenameProcess(file, this.settings.autoRename)
				} else {
					console.log("not images")
				}
			})
		)

		// name: 'editor-paste', callback: ()
		this.registerEvent(this.app.workspace.on("editor-paste", this.customPasteEventCallback))

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}


	onunload() {

	}



	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}




function isPastedImage(file: TAbstractFile): boolean {
	console.log("immlislll", this.imageNameList)
	if (file instanceof TFile && this.imageNameList.length === 1 
			&& this.imageNameList[0].type === PasteImageType.NetworkImage ) 
			return true
			// || file.name.startsWith(PASTED_IMAGE_PREFIX))  return true

	return false
}

function isMarkdownFile(file: TAbstractFile): boolean {
	if (file instanceof TFile) {
		if (file.extension === 'md') {
			return true
		}
	}
	return false
}

const IMAGE_EXTS = [
	'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg',
]

function isImage(file: TAbstractFile): boolean {
	if (file instanceof TFile) {
		if (IMAGE_EXTS.contains(file.extension.toLowerCase())) {
			return true
		}
	}
	return false
}