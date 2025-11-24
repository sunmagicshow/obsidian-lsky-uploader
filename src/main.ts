import {
    Plugin,
    MarkdownView,
    Notice,
    Editor,
    MenuItem,
    Menu,
} from 'obsidian';
import {AutoImageSettings, CommandConfig, DEFAULT_SETTINGS} from './types';
import {LskyUploaderView} from './lskyUploaderView';
import {LskyUploaderSettingTab} from './lskyUploaderSettingTab';
import {i18n} from './i18n';

declare module 'obsidian' {
    interface MenuItem {
        dom: HTMLElement | undefined;
    }
}
/* global setTimeout */

/**
 * LskyUploader 插件主类
 * 负责图片上传、删除、下载等功能
 */
export default class LskyUploader extends Plugin {
    public settings: AutoImageSettings = DEFAULT_SETTINGS;
    public editor?: Editor;
    public uploaderView!: LskyUploaderView;

    /**
     * 命令配置数组
     */
    private readonly commandConfigs: CommandConfig[] = [
        {
            id: 'upload-image',
            key: 'showUploadButton',
            title: () => i18n.t.commands.upload_image,
            icon: 'upload',
            action: async (selectedText: string, editor: Editor) =>
                this.uploaderView.uploadImage(selectedText, editor, this.app),
            errorKey: 'upload_failed',
        },
        {
            id: 'delete-image',
            key: 'showDeleteButton',
            title: () => i18n.t.commands.delete_image,
            icon: 'trash',
            action: async (selectedText: string, editor: Editor) =>
                this.uploaderView.deleteImages(selectedText, editor),
            errorKey: 'delete_failed',
        },
        {
            id: 'download-image',
            key: 'showDownloadButton',
            title: () => i18n.t.commands.download_image,
            icon: 'download',
            action: (selectedText: string) =>
                this.uploaderView.downloadImages(selectedText, this.app),
            errorKey: 'download_failed',
        },
    ];

    /**
     * 加载插件设置
     */
    public async loadSettings(): Promise<void> {
        const savedSettings = (await this.loadData()) as Partial<AutoImageSettings>;
        this.settings = {...DEFAULT_SETTINGS, ...savedSettings};
        if (!this.uploaderView) {
            this.uploaderView = new LskyUploaderView(this.settings);
        }
    }

    /**
     * 插件加载时的初始化逻辑
     */
    public async onload(): Promise<void> {
        if (!this.manifest) {
            return;
        }

        await this.loadSettings();

        // 注册右键菜单
        this.registerEvent(
            this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
                const selectedText = editor.getSelection();
                this.registerContextMenuItems(menu, selectedText, editor);
            }),
        );

        // 注册粘贴事件处理
        this.registerEvent(
            this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
                await this.handlePasteEvent(evt, editor);
            }),
        );

        // 注册命令
        this.registerCommands();

        // 添加设置选项卡
        this.addSettingTab(new LskyUploaderSettingTab(this.app, this));

        // 注册布局变化监听
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                this.updateActiveEditor();
            }),
        );
    }

    /**
     * 插件卸载时的清理逻辑
     */
    public onunload(): void {
        new Notice(i18n.t.general.plugin_unloaded);
    }


    /**
     * 注册右键菜单项
     * @param menu - 菜单对象
     * @param selectedText - 选中的文本
     * @param editor - 编辑器实例
     */
    private registerContextMenuItems(menu: Menu, selectedText: string, editor: Editor): void {
        this.commandConfigs.forEach((config: CommandConfig) => {
            if (this.settings[config.key as keyof AutoImageSettings]) {
                menu.addItem((item: MenuItem) => {
                    item
                        .setTitle(config.title())
                        .setIcon(config.icon)
                        .onClick(async () => {
                            if (selectedText) {
                                await this.executeAction(config, selectedText, editor);
                            } else {
                                new Notice(i18n.getNoSelectionText());
                            }
                        });

                    // 延迟设置 DOM 属性以确保元素已创建
                    setTimeout(() => {
                        if (item.dom && item.dom instanceof HTMLElement) {
                            item.dom.setAttribute('data-id', `my-command-${config.id}`);
                        }
                    }, 0);
                });
            }
        });
    }

    /**
     * 处理粘贴事件
     * @param evt - 剪贴板事件
     * @param editor - 编辑器实例
     */
    private async handlePasteEvent(evt: ClipboardEvent, editor: Editor): Promise<void> {
        if (!evt.clipboardData || !this.settings.is_upload_clipboard) {
            return;
        }

        const {items} = evt.clipboardData;

        for (let i = 0; i < items.length; i += 1) {
            const item = items[i];

            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                if (file) {
                    evt.preventDefault();
                    const cursor = editor.getCursor();
                    await this.uploaderView.upload(file, editor, cursor);
                    break;
                }
            }
        }
    }

    /**
     * 注册所有命令
     */
    private registerCommands(): void {
        this.commandConfigs.forEach((config: CommandConfig) => {
            if (this.settings[config.key as keyof AutoImageSettings]) {
                this.addCommand({
                    id: config.id,
                    name: config.title(),
                    checkCallback: (checking: boolean) => {
                        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                        if (markdownView && markdownView.editor) {
                            if (!checking) {
                                const selectedText = markdownView.editor.getSelection();
                                if (selectedText) {
                                    void this.executeAction(config, selectedText, markdownView.editor);
                                } else {
                                    new Notice(i18n.getNoSelectionText());
                                }
                            }
                            return true;
                        }
                        return false;
                    },
                });
            }
        });
    }

    /**
     * 执行命令操作
     * @param config - 命令配置
     * @param selectedText - 选中的文本
     * @param editor - 编辑器实例
     */
    private async executeAction(config: CommandConfig, selectedText: string, editor: Editor): Promise<void> {
        try {
            await config.action(selectedText, editor);
        } catch {
            new Notice(`${i18n.t.general[config.errorKey as keyof typeof i18n.t.general]}`);
        }
    }

    /**
     * 更新当前活动的编辑器实例
     */
    private updateActiveEditor(): void {
        const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeLeaf) {
            this.editor = activeLeaf.editor;
        }
    }
}