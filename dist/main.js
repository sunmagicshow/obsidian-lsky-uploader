"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LskyUploader
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  apiBaseURL: "http://example.com:port",
  token: "Bearer ...",
  strategy_id: 1,
  newWorkBlackDomains: "example.com",
  image_width: 0,
  limit_count: 0,
  is_need_delete: true
};
var LskyUploader = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = DEFAULT_SETTINGS;
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  async onload() {
    console.log("Manifest:", this.manifest);
    if (!this.manifest) {
      console.error("Manifest is undefined.");
      return;
    }
    await this.loadSettings();
    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor, view) => {
        const selectedText = editor.getSelection();
        menu.addItem((item) => {
          item.setTitle("\u4E0A\u4F20\u56FE\u5E8A\u56FE\u7247").setIcon("upload").onClick(async () => {
            if (selectedText) {
              await this.updateImage(selectedText, editor);
            } else {
              new import_obsidian.Notice("\u8BF7\u5148\u9009\u4E2D\u4E00\u4E2A\u6709\u6548\u7684\u56FE\u50CFURL");
            }
          });
          const itemEl = item.dom;
          if (itemEl) {
            itemEl.dataset.id = "my-command-upload-image";
          }
        });
        menu.addItem((item) => {
          item.setTitle("\u5220\u9664\u56FE\u5E8A\u56FE\u7247").setIcon("trash").onClick(async () => {
            if (selectedText) {
              await this.deleteImages(selectedText, editor);
            } else {
              new import_obsidian.Notice("\u8BF7\u5148\u9009\u4E2D\u4E00\u4E2A\u6709\u6548\u7684\u56FE\u50CFURL");
            }
          });
          const itemEl = item.dom;
          if (itemEl) {
            itemEl.dataset.id = "my-command-delete-image";
          }
        });
      })
    );
    this.registerEvent(this.app.workspace.on("editor-paste", async (evt, editor) => {
    }));
    this.addCommand({
      id: "my-command-delete-image",
      name: "\u5220\u9664\u56FE\u5E8A\u56FE\u7247",
      checkCallback: (checking) => {
      }
    });
    this.addCommand({
      id: "my-command-upload-image",
      name: "\u4E0A\u4F20\u56FE\u5E8A\u56FE\u7247",
      checkCallback: (checking) => {
      }
    });
    this.addSettingTab(new AutoImageSettingTab(this.app, this));
    this.registerEvent(this.app.workspace.on("layout-change", () => {
    }));
  }
  onunload() {
    new import_obsidian.Notice("\u63D2\u4EF6\u5378\u8F7D\u6210\u529F");
  }
  async uploadImage(file, editor, insertPos) {
    var _a;
    editor.replaceRange("\u4E0A\u4F20\u4E2D...", insertPos, insertPos);
    try {
      const imagename = this.getFormattedImageName();
      const originalName = file.name;
      let ext = "png";
      if (originalName && originalName.includes(".")) {
        const originalExt = (_a = originalName.split(".").pop()) == null ? void 0 : _a.toLowerCase();
        const supportedFormats = ["jpeg", "jpg", "png", "gif", "tif", "bmp", "ico", "psd", "webp"];
        if (originalExt && supportedFormats.includes(originalExt)) {
          ext = originalExt;
        }
      } else {
        const mimeToExt = {
          "image/jpeg": "jpg",
          "image/jpg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/tiff": "tif",
          "image/bmp": "bmp",
          "image/x-icon": "ico",
          "image/vnd.adobe.photoshop": "psd",
          "image/webp": "webp"
        };
        ext = mimeToExt[file.type] || "png";
      }
      const file1 = new File([file], `${imagename}.${ext}`, { type: file.type });
      const formData = new FormData();
      formData.append("file", file1);
      formData.append("strategy_id", this.settings.strategy_id.toString());
      const response = await fetch(`${this.settings.apiBaseURL}/api/v1/upload`, {
        method: "POST",
        headers: {
          "Authorization": this.settings.token.startsWith("Bearer ") ? this.settings.token : "Bearer " + this.settings.token
        },
        body: formData
      });
      if (!response.ok) {
        throw new Error(`\u56FE\u7247\u4E0A\u4F20\u5931\u8D25: ${response.status}`);
      }
      const responseData = await response.json();
      const imageUrl = responseData.data.links.url;
      const currentLine = editor.getLine(insertPos.line);
      let updatedLine;
      if (this.settings.image_width === 0) {
        updatedLine = currentLine.replace("\u4E0A\u4F20\u4E2D...", `![image.${ext}](${imageUrl})`);
      } else {
        updatedLine = currentLine.replace("\u4E0A\u4F20\u4E2D...", `![image.${ext}|${this.settings.image_width}](${imageUrl})`);
      }
      insertPos.ch = 6;
      editor.setCursor(insertPos);
      editor.replaceRange(updatedLine, { line: insertPos.line, ch: 0 }, {
        line: insertPos.line,
        ch: currentLine.length
      });
      let cursorPosition = editor.getCursor();
      editor.replaceRange("\n\n", cursorPosition);
      insertPos.line += 2;
      insertPos.ch = 0;
      editor.setCursor(insertPos);
    } catch (error) {
      new import_obsidian.Notice(`\u56FE\u7247\u4E0A\u4F20\u5931\u8D25: ${error.message}`);
      editor.replaceRange("", insertPos, { line: insertPos.line, ch: insertPos.ch + 12 });
    }
  }
  async deleteImages(selectedText, editor) {
    var _a;
    try {
      const urlRegex = /\bhttps?:\/\/[^\s)]+\.(jpeg|jpg|png|gif|tif|bmp|ico|psd|webp)/g;
      const imageUrls = ((_a = selectedText.match(urlRegex)) == null ? void 0 : _a.map((match) => match.trim())) || [];
      if (imageUrls.length === 0) {
        new import_obsidian.Notice("\u6CA1\u6709\u627E\u5230\u56FE\u7247\u94FE\u63A5");
        return;
      }
      let updatedSelection = selectedText;
      let errors = [];
      let successCount = 0;
      let skippedCount = 0;
      const headers = {
        "Accept": "application/json",
        "Authorization": this.settings.token.startsWith("Bearer ") ? this.settings.token : "Bearer " + this.settings.token
      };
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        if (this.settings.limit_count > 0 && i >= this.settings.limit_count) {
          skippedCount++;
          continue;
        }
        const name = imageUrl.split("/").pop();
        if (!name) {
          errors.push(`\u65E0\u6548\u7684\u56FE\u7247\u94FE\u63A5: ${imageUrl}`);
          continue;
        }
        const keyword = name.split("-")[0];
        const requestUrlString = `${this.settings.apiBaseURL}/api/v1/images?keyword=${keyword}`;
        const response = await (0, import_obsidian.requestUrl)({
          url: requestUrlString,
          method: "GET",
          headers,
          throw: false
        });
        if (response.status !== 200) {
          errors.push(`\u83B7\u53D6\u56FE\u7247\u5931\u8D25: ${response.status}`);
          continue;
        }
        const list = response.json.data.data;
        let found = false;
        if (list.length > 0) {
          for (const item of list) {
            if (item.name === name) {
              const deleteResponse = await (0, import_obsidian.requestUrl)({
                url: `${this.settings.apiBaseURL}/api/v1/images/${item.key}`,
                method: "DELETE",
                headers,
                throw: false
              });
              if (deleteResponse.status === 200 || deleteResponse.text) {
                found = true;
                updatedSelection = updatedSelection.replace(imageUrl, "");
                successCount++;
              } else {
                errors.push(`\u56FE\u7247\u5220\u9664\u5931\u8D25: ${deleteResponse.status}`);
              }
            }
          }
        }
        if (!found) {
          errors.push(`\u672A\u627E\u5230\u5BF9\u5E94\u7684\u56FE\u7247: ${imageUrl}`);
        }
      }
      editor.replaceSelection(updatedSelection);
      if (errors.length > 0) {
        new import_obsidian.Notice(`\u5220\u9664\u5931\u8D25: 
${errors.join("\n")}`);
      }
      if (successCount > 0) {
        new import_obsidian.Notice(`\u6210\u529F\u5220\u9664\u4E86 ${successCount} \u5F20\u56FE\u7247`);
      }
      if (skippedCount > 0) {
        new import_obsidian.Notice(`\u9009\u4E2D\u5220\u9664\u56FE\u7247\u6570\u91CF\u8D85\u8FC7 ${this.settings.limit_count} \u5F20,\u8DF3\u8FC7\u4E86 ${skippedCount} \u5F20`);
      } else if (errors.length === 0 && successCount === 0) {
        new import_obsidian.Notice("\u6CA1\u6709\u56FE\u7247\u88AB\u5220\u9664");
      }
    } catch (error) {
      new import_obsidian.Notice(`\u9519\u8BEF: ${error.message || error}`);
    }
  }
  async updateImage(selectedText, editor) {
    const urlRegex = /(!\[[^\]]*\]\()([^)]+)(\))|(!\[\[([^\]]+)\]\])/gi;
    let match;
    let processedText = selectedText;
    let successCount = 0;
    let blacklistedCount = 0;
    let skippedCount = 0;
    let errors = [];
    let processedUrls = 0;
    while ((match = urlRegex.exec(selectedText)) !== null) {
      if (this.settings.limit_count > 0 && processedUrls >= this.settings.limit_count) {
        skippedCount++;
        continue;
      }
      processedUrls++;
      try {
        let fullMatch = match[0];
        let isInternalLink = match[4] !== void 0;
        let urlPart = isInternalLink ? match[5] : match[2];
        if (isInternalLink) {
          const fileName = urlPart;
          const file = this.app.vault.getFiles().find(
            (f) => f.name === fileName || f.basename === fileName.replace(/\.[^/.]+$/, "")
          );
          if (!file) {
            errors.push(`\u627E\u4E0D\u5230\u5185\u90E8\u6587\u4EF6: ${fileName}`);
            continue;
          }
          const imageExtensions = ["jpeg", "jpg", "png", "gif", "tif", "bmp", "ico", "psd", "webp"];
          const fileExt = file.extension.toLowerCase();
          if (!imageExtensions.includes(fileExt)) {
            errors.push(`\u6587\u4EF6\u4E0D\u662F\u56FE\u7247\u683C\u5F0F: ${fileName}`);
            continue;
          }
          const arrayBuffer = await this.app.vault.readBinary(file);
          const imagename = this.getFormattedImageName();
          const mimeType = this.getMimeTypeFromExtension(fileExt);
          const blob = new Blob([arrayBuffer], { type: mimeType });
          const fileObj = new File([blob], `${imagename}.${fileExt}`, { type: mimeType });
          const formData = new FormData();
          formData.append("file", fileObj);
          formData.append("strategy_id", this.settings.strategy_id.toString());
          const uploadResponse = await fetch(`${this.settings.apiBaseURL}/api/v1/upload`, {
            method: "POST",
            headers: {
              "Authorization": this.settings.token.startsWith("Bearer ") ? this.settings.token : "Bearer " + this.settings.token
            },
            body: formData
          });
          if (!uploadResponse.ok) {
            errors.push(`\u56FE\u7247\u4E0A\u4F20\u5931\u8D25: ${uploadResponse.status} - ${fileName}`);
            continue;
          }
          const responseData = await uploadResponse.json();
          let newUrl;
          if (responseData.data && responseData.data.links && responseData.data.links.url) {
            newUrl = responseData.data.links.url;
          } else if (responseData.data && responseData.data.url) {
            newUrl = responseData.data.url;
          } else if (responseData.url) {
            newUrl = responseData.url;
          } else {
            errors.push(`API\u54CD\u5E94\u683C\u5F0F\u4E0D\u6B63\u786E: ${JSON.stringify(responseData)}`);
            continue;
          }
          const altText = file.basename || "image";
          const replacement = this.settings.image_width === 0 ? `![image.${fileExt}](${newUrl})` : `![image.${fileExt}|${this.settings.image_width}](${newUrl})`;
          processedText = processedText.replace(fullMatch, replacement);
          successCount++;
          if (this.settings.is_need_delete) {
            try {
              await this.app.vault.trash(file, false);
              console.log(`\u5DF2\u5220\u9664\u5185\u90E8\u56FE\u7247: ${fileName}`);
            } catch (error) {
              errors.push(`\u5220\u9664\u5185\u90E8\u56FE\u7247\u5931\u8D25: ${error.message}`);
            }
          }
        } else {
          if (urlPart.startsWith("http://") || urlPart.startsWith("https://")) {
            const blackList = this.settings.newWorkBlackDomains.split(",").map((domain2) => domain2.trim()).filter((domain2) => domain2);
            ;
            let domain = "";
            try {
              domain = new URL(urlPart).hostname;
              if (blackList.includes(domain)) {
                blacklistedCount++;
                continue;
              }
            } catch (e) {
              errors.push(`\u65E0\u6548\u7684URL: ${urlPart}`);
              continue;
            }
            const response = await (0, import_obsidian.requestUrl)({
              url: urlPart,
              method: "GET",
              throw: false
            });
            if (response.status !== 200) {
              errors.push(`\u83B7\u53D6\u56FE\u7247\u5931\u8D25: ${response.status} - ${urlPart}`);
              continue;
            }
            const ext = this.getExtensionFromUrl(urlPart) || this.getExtensionFromContentType(response.headers["content-type"]) || "png";
            const imagename = this.getFormattedImageName();
            const blob = new Blob([new Uint8Array(response.arrayBuffer)], { type: response.headers["content-type"] });
            const fileObj = new File([blob], `${imagename}.${ext}`, { type: response.headers["content-type"] });
            const formData = new FormData();
            formData.append("file", fileObj);
            formData.append("strategy_id", this.settings.strategy_id.toString());
            const uploadResponse = await fetch(`${this.settings.apiBaseURL}/api/v1/upload`, {
              method: "POST",
              headers: {
                "Authorization": this.settings.token.startsWith("Bearer ") ? this.settings.token : "Bearer " + this.settings.token
              },
              body: formData
            });
            if (!uploadResponse.ok) {
              errors.push(`\u56FE\u7247\u4E0A\u4F20\u5931\u8D25: ${uploadResponse.status} - ${urlPart}`);
              continue;
            }
            const responseData = await uploadResponse.json();
            let newUrl;
            if (responseData.data && responseData.data.links && responseData.data.links.url) {
              newUrl = responseData.data.links.url;
            } else if (responseData.data && responseData.data.url) {
              newUrl = responseData.data.url;
            } else if (responseData.url) {
              newUrl = responseData.url;
            } else {
              errors.push(`API\u54CD\u5E94\u683C\u5F0F\u4E0D\u6B63\u786E: ${JSON.stringify(responseData)}`);
              continue;
            }
            const replacement = this.settings.image_width === 0 ? `![image.${ext}](${newUrl})` : `![image.${ext}|${this.settings.image_width}](${newUrl})`;
            processedText = processedText.replace(fullMatch, replacement);
            successCount++;
          } else {
            const filePath = decodeURIComponent(urlPart);
            const file = this.app.vault.getFiles().find((f) => f.path === filePath);
            if (!file) {
              errors.push(`\u627E\u4E0D\u5230\u672C\u5730\u6587\u4EF6: ${filePath}`);
              continue;
            }
            const imageExtensions = ["jpeg", "jpg", "png", "gif", "tif", "bmp", "ico", "psd", "webp"];
            const fileExt = file.extension.toLowerCase();
            if (!imageExtensions.includes(fileExt)) {
              errors.push(`\u6587\u4EF6\u4E0D\u662F\u56FE\u7247\u683C\u5F0F: ${filePath}`);
              continue;
            }
            const arrayBuffer = await this.app.vault.readBinary(file);
            const imagename = this.getFormattedImageName();
            const mimeType = this.getMimeTypeFromExtension(fileExt);
            const blob = new Blob([arrayBuffer], { type: mimeType });
            const fileObj = new File([blob], `${imagename}.${fileExt}`, { type: mimeType });
            const formData = new FormData();
            formData.append("file", fileObj);
            formData.append("strategy_id", this.settings.strategy_id.toString());
            const uploadResponse = await fetch(`${this.settings.apiBaseURL}/api/v1/upload`, {
              method: "POST",
              headers: {
                "Authorization": this.settings.token.startsWith("Bearer ") ? this.settings.token : "Bearer " + this.settings.token
              },
              body: formData
            });
            if (!uploadResponse.ok) {
              errors.push(`\u56FE\u7247\u4E0A\u4F20\u5931\u8D25: ${uploadResponse.status} - ${filePath}`);
              continue;
            }
            const responseData = await uploadResponse.json();
            let newUrl;
            if (responseData.data && responseData.data.links && responseData.data.links.url) {
              newUrl = responseData.data.links.url;
            } else if (responseData.data && responseData.data.url) {
              newUrl = responseData.data.url;
            } else if (responseData.url) {
              newUrl = responseData.url;
            } else {
              errors.push(`API\u54CD\u5E94\u683C\u5F0F\u4E0D\u6B63\u786E: ${JSON.stringify(responseData)}`);
              continue;
            }
            let replacement;
            if (this.settings.image_width === 0) {
              replacement = `![image.${fileExt}](${newUrl})`;
            } else {
              replacement = `![image.${fileExt}|${this.settings.image_width}](${newUrl})`;
            }
            processedText = processedText.replace(fullMatch, replacement);
            successCount++;
            if (this.settings.is_need_delete) {
              try {
                await this.app.vault.trash(file, false);
                console.log(`\u5DF2\u5220\u9664\u672C\u5730\u56FE\u7247: ${filePath}`);
              } catch (error) {
                errors.push(`\u5220\u9664\u672C\u5730\u56FE\u7247\u5931\u8D25: ${error.message}`);
              }
            }
          }
        }
      } catch (error) {
        errors.push(`\u9519\u8BEF: ${error.message || error}`);
      }
    }
    if (processedText !== selectedText) {
      editor.replaceSelection(processedText);
    }
    if (errors.length > 0) {
      new import_obsidian.Notice(`\u5B58\u5728\u9519\u8BEF: 
${errors.slice(0, 3).join("\n")}${errors.length > 3 ? "\n..." : ""}`);
    }
    if (blacklistedCount > 0) {
      new import_obsidian.Notice(`\u8DF3\u8FC7\u9ED1\u540D\u5355\u57DF\u540D\u56FE\u7247 ${blacklistedCount} \u5F20`);
    }
    if (skippedCount > 0) {
      new import_obsidian.Notice(`\u9009\u4E2D\u4E0A\u4F20\u56FE\u7247\u6570\u91CF\u8D85\u8FC7 ${this.settings.limit_count} \u5F20,\u8DF3\u8FC7 ${skippedCount} \u5F20`);
    }
    if (successCount > 0) {
      new import_obsidian.Notice(`\u6210\u529F\u4E0A\u4F20 ${successCount} \u5F20\u56FE\u7247`);
    } else if (errors.length === 0 && blacklistedCount === 0 && skippedCount === 0) {
      new import_obsidian.Notice("\u6CA1\u6709\u627E\u5230\u53EF\u4E0A\u4F20\u7684\u56FE\u7247");
    }
  }
  // 辅助函数：生成格式化的图片名称
  getFormattedImageName() {
    const now = /* @__PURE__ */ new Date();
    const Y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const i = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    return `${Y}${m}${d}${h}${i}${s}${ms}`;
  }
  // 添加辅助方法：从URL获取文件扩展名
  getExtensionFromUrl(url) {
    const match = url.match(/\.(jpeg|jpg|png|gif|tif|bmp|ico|psd|webp)/i);
    return match ? match[1].toLowerCase() : null;
  }
  // 添加辅助方法：从Content-Type获取文件扩展名
  getExtensionFromContentType(contentType) {
    const mimeToExt = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/tiff": "tif",
      "image/bmp": "bmp",
      "image/x-icon": "ico",
      "image/vnd.adobe.photoshop": "psd",
      "image/webp": "webp"
    };
    return mimeToExt[contentType == null ? void 0 : contentType.toLowerCase()] || null;
  }
  // 添加辅助方法：根据文件扩展名获取MIME类型
  getMimeTypeFromExtension(ext) {
    const mimeTypes = {
      "jpeg": "image/jpeg",
      "jpg": "image/jpeg",
      "png": "image/png",
      "gif": "image/gif",
      "tif": "image/tiff",
      "bmp": "image/bmp",
      "ico": "image/x-icon",
      "psd": "image/vnd.adobe.photoshop",
      "webp": "image/webp"
    };
    return mimeTypes[ext.toLowerCase()] || "image/png";
  }
};
var AutoImageSettingTab = class extends import_obsidian.PluginSettingTab {
  // 这里正确定义了 plugin 属性
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "AutoImage \u8BBE\u7F6E" });
    new import_obsidian.Setting(containerEl).setName("API\u5730\u5740").setDesc("\u5170\u7A7A\u56FE\u5E8AAPI\u7684\u5730\u5740").addText(
      (text) => text.setPlaceholder("http://example.com:port").setValue(this.plugin.settings.apiBaseURL).onChange(async (value) => {
        this.plugin.settings.apiBaseURL = value.trim().replace(/\/+$/, "");
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("Bearer Token").setDesc("\u5170\u7A7A\u56FE\u5E8AAPI\u7684Bearer Token").addText(
      (text) => text.setPlaceholder("Bearer ...").setValue(this.plugin.settings.token).onChange(async (value) => {
        this.plugin.settings.token = value.trim();
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian.Setting(containerEl).setName("\u7B56\u7565ID").setDesc("\u5170\u7A7A\u56FE\u5E8AAPI\u7684\u7B56\u7565ID\uFF0C\u7528\u4E8E\u4E0A\u4F20\u56FE\u7247\u3002").addText((text) => {
      const inputEl = text.inputEl;
      inputEl.type = "number";
      inputEl.min = "0";
      inputEl.step = "1";
      text.setPlaceholder("0").setValue(this.plugin.settings.strategy_id.toString()).onChange(async (value) => {
        const intValue = parseInt(value.trim(), 10);
        if (!isNaN(intValue)) {
          this.plugin.settings.strategy_id = intValue;
          await this.plugin.saveSettings();
        } else {
          new import_obsidian.Notice("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u6574\u6570");
        }
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u57DF\u540D\u9ED1\u540D\u5355").setDesc("\u4F7F\u7528\u9017\u53F7\u5206\u9694\u7684\u57DF\u540D\u5217\u8868\uFF0C\u4E0A\u4F20\u5230\u8FD9\u4E9B\u57DF\u540D\u7684\u56FE\u7247\u5C06\u88AB\u8DF3\u8FC7\u3002\u4F8B\u5982\uFF1Aexample.com,test.org").addTextArea((textArea) => textArea.setValue(this.plugin.settings.newWorkBlackDomains).onChange(async (value) => {
      this.plugin.settings.newWorkBlackDomains = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u56FE\u7247\u5BBD\u5EA6").setDesc("\u8F93\u5165\u56FE\u7247\u7684\u5BBD\u5EA6\uFF0C\u5355\u4F4D\u4E3A\u50CF\u7D20\uFF0C\u9ED8\u8BA4\u4E3A0\uFF0C\u8868\u793A\u4F7F\u7528\u539F\u59CB\u56FE\u7247\u5927\u5C0F\u3002").addText((text) => {
      const inputEl = text.inputEl;
      inputEl.type = "number";
      inputEl.min = "0";
      inputEl.step = "1";
      text.setPlaceholder("0").setValue(this.plugin.settings.image_width.toString()).onChange(async (value) => {
        const intValue = parseInt(value.trim(), 10);
        if (!isNaN(intValue)) {
          this.plugin.settings.image_width = intValue;
          await this.plugin.saveSettings();
        } else {
          new import_obsidian.Notice("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u6574\u6570");
        }
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u6700\u5927\u4E0A\u4F20\u548C\u5220\u9664\u56FE\u7247\u6570\u91CF").setDesc("\u8F93\u5165\u6700\u5927\u4E0A\u4F20\u548C\u5220\u9664\u56FE\u7247\u6570\u91CF\uFF0C\u8D85\u8FC7\u6570\u91CF\u7684\u56FE\u7247\u5C06\u88AB\u8DF3\u8FC7,\u5EFA\u8BAE\u8BBE\u7F6E\u5C0F\u4E8E\u7B49\u4E8E50\u3002").addText((text) => {
      const inputEl = text.inputEl;
      inputEl.type = "number";
      inputEl.min = "0";
      inputEl.step = "1";
      text.setPlaceholder("0").setValue(this.plugin.settings.limit_count.toString()).onChange(async (value) => {
        const intValue = parseInt(value.trim(), 10);
        if (!isNaN(intValue)) {
          this.plugin.settings.limit_count = intValue;
          await this.plugin.saveSettings();
        } else {
          new import_obsidian.Notice("\u8BF7\u8F93\u5165\u6709\u6548\u7684\u6574\u6570");
        }
      });
    });
    new import_obsidian.Setting(containerEl).setName("\u4E0A\u4F20\u6210\u529F\u540E\u5220\u9664\u672C\u5730\u56FE\u7247").setDesc("\u5982\u679C\u52FE\u9009\uFF0C\u5219\u5728\u4E0A\u4F20\u6210\u529F\u540E\u5220\u9664\u672C\u5730\u56FE\u7247\u3002").addToggle((toggle) => {
      toggle.setValue(this.plugin.settings.is_need_delete || false).onChange(async (value) => {
        this.plugin.settings.is_need_delete = value;
        await this.plugin.saveSettings();
      });
    });
  }
};
//# sourceMappingURL=main.js.map
