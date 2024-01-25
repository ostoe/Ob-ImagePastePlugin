import { App, PluginSettingTab, Setting, TextComponent, setIcon } from "obsidian";
// import type { ILocaleOverride, IWeekStartOption } from "obsidian-calendar-ui";

// import { DEFAULT_WEEK_FORMAT, DEFAULT_WORDS_PER_DOT } from "src/constants";

import type CalendarPlugin from "./main";
import ImageCPPlugin from "./main";

export interface ISettings {
  wordsPerDot: number;
  //   weekStart: IWeekStartOption;
  shouldConfirmBeforeCreate: boolean;

  // Weekly Note settings
  showWeeklyNote: boolean;
  weeklyNoteFormat: string;
  weeklyNoteTemplate: string;
  weeklyNoteFolder: string;

  // localeOverride: ILocaleOverride;
}



export const defaultSettings = Object.freeze({
  shouldConfirmBeforeCreate: true,
  // weekStart: "locale" as IWeekStartOption,

  wordsPerDot: "DEFAULT_WORDS_PER_DOT",

  showWeeklyNote: false,
  weeklyNoteFormat: "",
  weeklyNoteTemplate: "",
  weeklyNoteFolder: "",

  localeOverride: "system-default",
});

export function appHasPeriodicNotesPluginLoaded(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodicNotes = (<any>window.app).plugins.getPlugin("periodic-notes");
  return periodicNotes && periodicNotes.settings?.weekly?.enabled;
}

export class PasteSettingsTab extends PluginSettingTab {
  plugin: ImageCPPlugin;
  inputEI: TextComponent | null;
  constructor(app: App, plugin: ImageCPPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    // const { containerEl } = this;
    this.containerEl.empty();

    // if (!appHasDailyNotesPluginLoaded()) {
    // this.containerEl.createDiv("settings-banner", (banner) => {
    //   banner.createEl("h3", {
    //     text: "⚠️ Daily Notes plugin not enabled",
    //   });
    //   banner.createEl("p", {
    //     cls: "setting-item-description",
    //     text:
    //       "The calendar is best used in conjunction with either the Daily Notes plugin or the Periodic Notes plugin (available in the Community Plugins catalog).",
    //   });
    // });


    this.containerEl.createEl("h1", { text: "Paste Image Option" });
    this.containerEl.createEl("p", { text: "Github repo link: " }).createEl("a", {
      text: "Paste Image Plugin🎅",
      href: "https://github.com/ostoe/Ob-ImagePastePlugin",
    });


    this.containerEl.createEl("h3", {
      text: "When Insert",
    });
    this.containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "Positions and rules saved when pasting or inserting",
    });
    this.addPastePathSetting();

    // if (this.plugin.options.IsShowCustomPath) {
      this.addPastePathInputSetting();
    // }

    this.addApplyRuleOnlineImageSetting();
    this.addApplyRuleToLocalImageSetting();


    // collection
    this.containerEl.createEl("h3", {
      text: "Preferred lmage Syntax",
    });
    this.containerEl.createEl("p", {
      cls: "setting-item-description",
      text:
        "You can find following options to config which pattern of markdown source will be generated when insert images.",
    });
    this.addImageRelativePathSetting();
    this.addSpecialFormat1RelativePathSetting();
    this.addEscapeURLPathSetting();


    this.containerEl.createEl("h3", {
      text: "Advanced Settings",
    });



    // new Setting(this.containerEl).setName('Date display format').then((setting) => {
    //   setting.addMomentFormat((mf) => {
    //     setting.descEl.appendChild(
    //       createFragment((frag) => {
    //         frag.appendText(
             
    //             'This format will be used when displaying dates in Kanban cards.'
             
    //         );
    //         frag.createEl('br');
    //         frag.appendText('For more syntax, refer to');
    //         frag.createEl(
    //           'a',
    //           {
    //             text: ('format reference'),
    //             href: 'https://momentjs.com/docs/#/displaying/format/',
    //           },
    //           (a) => {
    //             a.setAttr('target', '_blank');
    //           }
    //         );
    //         frag.createEl('br');
    //         frag.appendText(t('Your current syntax looks like this') + ': ');
    //         mf.setSampleEl(frag.createEl('b', { cls: 'u-pop' }));
    //         frag.createEl('br');
    //       })
    //     );

    //     // const [value, globalValue] = this.getSetting(
    //     //   'date-display-format',
    //     //   local
    //     // );
    //     // const defaultFormat = getDefaultDateFormat(this.app);

    //     mf.setPlaceholder("defaultFormat");
    //     mf.setDefaultFormat("defaultFormat111");
    //     mf.setValue(("value"))
     
    //     mf.onChange((newValue) => {
    //       if (newValue) {
    //         this.applySettingsUpdate({
    //           'date-display-format': {
    //             $set: newValue,
    //           },
    //         });
    //       } else {
    //         this.applySettingsUpdate({
    //           $unset: ['date-display-format'],
    //         });
    //       }
    //     });
    //   });
    // });

    // this.addLocaleOverrideSetting();
  }

  ////////////////////////





  // 
  addPastePathSetting(): void {
    new Setting(this.containerEl)
      .setName("Select Image Save Path")
      .setDesc(
        "Choose what day of the week to start. Select 'Locale default' to use the default specified by moment.js"
      )
      .addDropdown((dropdown) => {
        // var localeWeekStart = "Default"
        var PasteOptions: Record<string, string> = {
          default: "Default",
          current: "Copy image to current folder (/)",
          toassets: "Copy image to ./assets",
          tofilenameassests: "Copy image to ./${filename}.assets",
          // "Upload image",
          tocustom: "Copy image to custom folder"
        }

        // dropdown.addOption("locale", `Locale default (${localizedWeekdays[0]})`);
        // PasteOptions.forEach((day, i) => {
        //   dropdown.addOption(weekdays[i], day);
        // });
        dropdown.addOptions(PasteOptions);
        dropdown.setValue(this.plugin.settings.PasteImageOption)
        // dropdown.setValue(this.plugin.options.PasteImageOption);
        .onChange((value) => {
          this.plugin.settings.PasteImageOption = value
          // console.log(value)
          this.plugin.saveSettings()
          this.inputEI?.setDisabled(  !(this.plugin.settings.IsShowCustomPath = value == "tocustom"))
          if (value == "tocustom")
          if (value != "tocustom")  this.plugin.settings.CustomPath = ""
          // this.plugin.writeOptions("1243" + value);
        });
      });
  }


  // addPastePathInputSetting
  addPastePathInputSetting(): void {
      new Setting(this.containerEl)
      // .setName("Copy image to custom folder")
      .setDesc(
        createFragment((e) => {
          const text = e.createDiv("admonition-convert");
          setIcon(text.createSpan(), "admonition-warning");
          text.createSpan({
              text: "This "
          });
          text.createEl("strong", { text: "will" });
          text.createSpan({
              text: " modify notes. Use at your own risk and please make backups."
          });
          e.createEl("p", {
              text: "IF set path start with './', it will set a relative current MDFile path."
          });
          e.createEl("p", {
            text: "IF set path start without './, it will set a relative workspace root path."
        });
      })
      )
      // .setDesc("Please specify a relative path to current folder which begins with './' or '../', or an absolute folder path. (${filename} representing for currents filename.)")

      .addText((textfield) => {
        this.inputEI =   textfield;
        textfield.setPlaceholder(String("default"));
        // textfield.inputEl.type = "string";
        textfield.setValue(this.plugin.settings.CustomPath );
        textfield.onChange(async (value) => {
          this.plugin.settings.CustomPath = value
          this.plugin.saveSettings();
        })
        ;
      });

      this.inputEI?.setDisabled(!this.plugin.settings.IsShowCustomPath);



  }


  addApplyRuleOnlineImageSetting(): void {
    new Setting(this.containerEl)
      .setName("Apply Rule To Online Image Setting")
      // .setDesc('For example, if you insert a file at \'img/example file.png\', it will become"img/example%20file.png\' Enable this for better compatibility with otherMarkdown engines, or disable this for better readability. ItWill affect formatting/restructuring commands')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.IsApplyNetworklImage);
        toggle.onChange(async (value) => {
          this.plugin.settings.IsApplyNetworklImage = value
          this.plugin.saveSettings();
        });
      });
  }


  addApplyRuleToLocalImageSetting(): void {
    new Setting(this.containerEl)
      .setName("Apply Rule To Local Image Setting")
      // .setDesc('For example, if you insert a file at \'img/example file.png\', it will become"img/example%20file.png\' Enable this for better compatibility with otherMarkdown engines, or disable this for better readability. ItWill affect formatting/restructuring commands')
      .addToggle((toggle) => {
        toggle.setValue( this.plugin.settings.IsApplyLocalImage);
        toggle.onChange(async (value) => {
          this.plugin.settings.IsApplyLocalImage = value
          this.plugin.saveSettings();
        });
      });
  }


  /////////////////////////////////



  addImageRelativePathSetting(): void {
    new Setting(this.containerEl)
      .setName("Use relative path if possible")
      // .setDesc('For example, if you insert a file at \'img/example file.png\', it will become"img/example%20file.png\' Enable this for better compatibility with otherMarkdown engines, or disable this for better readability. ItWill affect formatting/restructuring commands')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.IsRelativePath);
        toggle.onChange(async (value) => {
          this.plugin.settings.IsRelativePath = value
          this.plugin.saveSettings();
        });
      });
  }

  addSpecialFormat1RelativePathSetting(): void {
    new Setting(this.containerEl)
      .setName("Add ./ for relative path")
      .setDesc('When enabled, Typora will use pattern like ./assets/image.png instead ofassets/imagepng when generating relative path for inserted images.')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.IsAddRelativePath);
        toggle.onChange(async (value) => {
          this.plugin.settings.IsAddRelativePath = value
          this.plugin.saveSettings();
        });
      });
  }

  addEscapeURLPathSetting(): void {
    new Setting(this.containerEl)
      .setName("Auto escape image URL when insert")
      .setDesc('For example, if you insert a file at \'img/example file.png\', it will become"img/example%20file.png\' Enable this for better compatibility with otherMarkdown engines, or disable this for better readability. ItWill affect formatting/restructuring commands')
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.IsEscapeUriPath);
        toggle.onChange(async (value) => {
          this.plugin.settings.IsEscapeUriPath = value
          this.plugin.saveSettings();
        });
      });
  }





  addDotThresholdSetting(): void {
    new Setting(this.containerEl)
      .setName("Auto escape image URL when insert")
      .setDesc('For example, if you insert a file at \'img/example file.png\', it will become"img/example%20file.png\' Enable this for better compatibility with otherMarkdown engines, or disable this for better readability. ItWill affect formatting/restructuring commands')
      .addToggle((toggle) => {
        toggle.setValue(true);
        toggle.onChange(async (value) => {
          this.plugin.saveSettings();
        });
      });

  }

  

  addConfirmCreateSetting(): void {
    new Setting(this.containerEl)
      .setName("Confirm before creating new note")
      .setDesc("Show a confirmation modal before creating a new note")
      .addText((textfield) => {
        textfield.setPlaceholder(String("defaulltss"));
        textfield.inputEl.type = "number";
        textfield.setValue(String("this.plugin.options.wordsPerDot"));
        textfield.onChange(async (value) => {
          this.plugin.saveSettings();
        });
      });
  }

}