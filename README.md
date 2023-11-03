# Obsidian Image ClassifyPaste Plugin

## 1. This plugin able let you paste image like typora, also support paste multi-image copy from local image,and can reconstructor you markdown file history,
### operate steop
Suppose there is a `MyTest.md` file, I will do with some step:
1. Copy network image from Chrome Browers
2. Paste in `Mytest.md` markdown file
3. The plugin will auto create `MyTest` directory which name same to markdown file.
4. Save image which path was `MyTest/image_filename.png`

you paste network image
before  :
`![[Paste Image xxx.png]]`
after:
`![imgxxx](md_file_dir/xxxx.png)`
## 2. Resolve history image path issue.
Suppose there is a Mytest.md file, which has some content:
```md
![[Paste Image xxxx1.png]]
![[Paste Image xxxx2.png]]
![[Paste Image xxxx3.png]]
......
```
`Ctrl + P` search this plugin command to resolve the imge path issue.
then:
1. Create `MyTest` Directory which name same to markdown file.
2. move `Paste Image xxxx...png` file to `MyTest` directory,
3. update the markdown file content which `![[Paste Image xxxx1.png]]` to `![img](MyTest/Paste-Image-xxx.png)`


## TODO
 - set paste name
 - auto size
 - reg directory name.


# 调试快捷键：
如果更新了ob版本后 ，ctrl+shift+i无法调出devtool，在设置里面搜索“调试快捷键”，取消设置ctrl+shift+i，然后再使用该快捷键即可生效

# 
