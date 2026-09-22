<template>
  <div class="ff">
    <!-- 左侧：格式导航树 -->
    <aside class="ff-side">
      <div class="ff-brand">
        <i class="el-icon-headset" />
        <span>音乐解锁</span>
      </div>
      <div class="ff-nav">
        <div class="ff-nav-group">输出音频格式</div>
        <div class="ff-nav-item" :class="{ active: outputFormat === 'mp3' }" @click="outputFormat = 'mp3'">
          <i class="el-icon-files" /> MP3
        </div>
        <div class="ff-nav-item" :class="{ active: outputFormat === 'original' }" @click="outputFormat = 'original'">
          <i class="el-icon-document" /> 原始格式
        </div>
        <div class="ff-nav-group">工具</div>
        <div class="ff-nav-item" @click="showConfigDialog = true">
          <i class="el-icon-setting" /> 解密设定
        </div>
        <div class="ff-nav-group">系统</div>
        <div class="ff-nav-item" @click="showSettingsDialog = true">
          <i class="el-icon-setting" /> 设置
        </div>
        <div class="ff-nav-item" @click="showAboutDialog = true">
          <i class="el-icon-info" /> 关于
        </div>
      </div>

      <div class="ff-side-drop ff-compact">
        <file-selector ref="fileSelector" @error="showFail" @success="showSuccess" />
      </div>
      <div class="ff-side-tip">所有运算在本机完成<br />文件不会上传到任何服务器</div>
    </aside>

    <!-- 右侧：主工作区 -->
    <main class="ff-main">
      <!-- 顶部工具栏 -->
      <div class="ff-toolbar">
        <el-button type="primary" icon="el-icon-video-play" :disabled="tableData.length === 0" @click="handleDownloadAll">全部下载</el-button>
        <el-button icon="el-icon-download" :disabled="selectedRows.length === 0" @click="handleDownloadSelected">下载选中</el-button>
        <el-button icon="el-icon-delete" :disabled="selectedRows.length === 0" @click="handleDeleteSelected">删除选中</el-button>
        <el-button icon="el-icon-delete" plain @click="handleDeleteAll">清空</el-button>
        <span class="ff-tool-spacer" />
        <el-tooltip effect="dark" placement="bottom">
          <div slot="content">大量文件解锁时建议开启，结果不留在浏览器中，防止内存不足</div>
          <el-checkbox v-model="instant_save" border size="small">立即保存</el-checkbox>
        </el-tooltip>
      </div>

      <!-- 任务区（支持拖拽添加） -->
      <div
        class="ff-body"
        :class="{ 'is-dragover': dragOver }"
        @dragenter.prevent="onDragEnter"
        @dragover.prevent
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onBodyDrop"
      >
        <div v-if="dragOver" class="ff-drop-hint">松开鼠标即可解锁这些文件</div>
        <div class="ff-list">
          <div v-if="tableData.length === 0" class="um-empty">
            <i class="el-icon-folder-opened" />
            <p>把加密音乐拖到左侧或本区域，或点击左侧选择文件开始解锁</p>
          </div>
          <PreviewTable
            v-else
            :policy="filename_policy"
            :table-data="tableData"
            @download="downloadWithFormat([$event], 'single')"
            @edit="editFile"
            @play="changePlaying"
            @selection-change="onSelectionChange"
          />
        </div>
      </div>

      <!-- 右下角可收起播放器 -->
      <div class="ff-player" :class="{ 'is-open': playerExpanded }">
        <el-button
          v-show="!playerExpanded"
          class="ff-player-fab"
          circle
          type="primary"
          icon="el-icon-headset"
          title="展开播放器"
          @click="playerExpanded = true"
        />
        <div v-show="playerExpanded" class="ff-player-card">
          <div class="ff-player-meta">
            <el-image class="ff-player-cover" :src="playingCover" fit="cover">
              <div slot="error" class="ff-player-cover-fallback"><i class="el-icon-headset" /></div>
            </el-image>
            <div class="ff-player-info">
              <div class="ff-player-title" :title="playingTitle">{{ playingTitle }}</div>
              <div class="ff-player-sub" :title="playingSub">{{ playingSub }}</div>
            </div>
            <el-button class="ff-player-collapse" type="text" icon="el-icon-arrow-down" title="收起" @click="playerExpanded = false" />
          </div>
          <audio
            ref="audioEl"
            :autoplay="playing_auto"
            :src="playing_url"
            @loadedmetadata="onAudioMeta"
            @timeupdate="onAudioTime"
            @play="isPlaying = true"
            @pause="isPlaying = false"
            @ended="isPlaying = false"
          />
          <div class="ff-player-controls">
            <el-button
              class="ff-player-btn"
              circle
              size="mini"
              type="primary"
              :icon="isPlaying ? 'el-icon-video-pause' : 'el-icon-video-play'"
              @click="togglePlay"
            />
            <span class="ff-player-time">{{ fmtTime(currentTime) }}</span>
            <input
              class="ff-player-seek"
              type="range"
              min="0"
              :max="playerDuration || 1"
              step="0.1"
              :value="currentTime"
              :style="seekStyle"
              @input="onSeek"
            />
            <span class="ff-player-time">{{ fmtTime(playerDuration) }}</span>
          </div>
        </div>
      </div>

      <!-- 底部状态栏 -->
      <div class="ff-status">
        <span>任务总数：{{ tableData.length }}</span>
        <span>已选中：{{ selectedRows.length }}</span>
        <span>输出格式：{{ outputFormat === 'mp3' ? 'MP3（128kbps）' : '原始格式' }}</span>
      </div>
    </main>

    <config-dialog :show="showConfigDialog" @done="showConfigDialog = false" />

    <!-- 设置窗口 -->
    <el-dialog title="设置" :visible.sync="showSettingsDialog" width="440px" class="ff-set-dialog">
      <div class="ff-set-row">
        <div class="ff-set-label">命名格式</div>
        <el-radio-group v-model="filename_policy" size="small">
          <el-radio v-for="k in FilenamePolicies" :key="k.key" :label="k.key">{{ k.text }}</el-radio>
        </el-radio-group>
      </div>
      <span slot="footer">
        <el-button type="primary" @click="showSettingsDialog = false">完成</el-button>
      </span>
    </el-dialog>
    <edit-dialog
      :show="showEditDialog"
      :picture="editing_data.picture"
      :title="editing_data.title"
      :artist="editing_data.artist"
      :album="editing_data.album"
      :albumartist="editing_data.albumartist"
      :genre="editing_data.genre"
      @cancel="showEditDialog = false"
      @ok="handleEdit"
    />

    <!-- 关于窗口 -->
    <el-dialog title="关于" :visible.sync="showAboutDialog" width="480px" class="ff-about-dialog">
      <div class="ff-about">
        <div class="ff-about-brand">
          <i class="el-icon-headset" />
          <div class="ff-about-brand-text">
            <div class="ff-about-name">
              音乐解锁
              <el-tag size="mini" type="info">v{{ version }}</el-tag>
            </div>
            <div class="ff-about-slogan">移除已购音乐的加密保护</div>
          </div>
        </div>
        <div class="ff-about-row">
          <div class="ff-about-label">支持格式</div>
          <div class="ff-about-value">网易云音乐(ncm) · QQ音乐(qmc / mflac / mgg) · 酷狗音乐(kgm) · 虾米音乐(xm) · 酷我音乐(kwm)</div>
        </div>
        <div class="ff-about-row">
          <div class="ff-about-label">相关链接</div>
          <div class="ff-about-value">
            <a href="https://git.unlock-music.dev/um/web" target="_blank">项目主页</a>
            <a href="https://git.unlock-music.dev/um/web/wiki/使用提示" target="_blank">使用提示</a>
            <a href="https://git.unlock-music.dev/um/web/src/branch/main/README.md" target="_blank">更多</a>
          </div>
        </div>
        <div class="ff-about-row">
          <div class="ff-about-label">原作者</div>
          <div class="ff-about-value">MengYX · Unlock Music</div>
        </div>
        <div class="ff-about-row">
          <div class="ff-about-label">修改维护</div>
          <div class="ff-about-value">RONGLINC93（二次开发与打包）</div>
        </div>
        <div class="ff-about-license">
          <!--如果进行二次开发，此行版权信息不得移除且应明显地标注于页面上-->
          <span>Copyright &copy; 2019 - {{ currentYear }} MengYX</span>
          音乐解锁使用
          <a href="https://git.unlock-music.dev/um/web/src/branch/main/LICENSE" target="_blank">MIT许可协议</a>
          开放源代码
        </div>
      </div>
      <span slot="footer">
        <el-button type="primary" @click="showAboutDialog = false">关闭</el-button>
      </span>
    </el-dialog>

    <div v-if="mp3ProgressVisible" class="mp3-progress-mask">
      <div class="mp3-progress-card">
        <div class="mp3-progress-title">转换进度</div>
        <el-progress type="circle" :width="120" :percentage="mp3Progress" :status="mp3ProgressError ? 'exception' : undefined" />
        <p class="mp3-progress-text">{{ mp3ProgressText }}</p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ff {
  display: flex;
  width: 100%;
  height: 100%;
  // 外层容器是 100% 尺寸 + 1px 边框，必须用 border-box，
  // 否则总尺寸比父级多 2px，右侧与底部的边框会被 el-main 的 overflow: hidden 裁掉
  box-sizing: border-box;
  overflow: hidden;
  background: var(--um-panel-bg);
  border: 1px solid var(--um-panel-border);
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  text-align: left;
}

// 左侧导航
.ff-side {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--um-panel-border);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--um-panel-bg);
}
.ff-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--um-text-main);
  padding: 4px 8px 16px;
  i {
    color: #409eff;
    font-size: 22px;
  }
}
.ff-nav {
  flex: 1;
}
.ff-nav-group {
  font-size: 12px;
  color: var(--um-text-comment);
  padding: 12px 8px 6px;
  letter-spacing: 1px;
}
.ff-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  margin: 2px 0;
  border-radius: 8px;
  color: var(--um-text-main);
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s ease, color 0.15s ease;
  &:hover {
    background: rgba(64, 158, 255, 0.10);
  }
  i {
    font-size: 16px;
    color: var(--um-text-comment);
  }
  &.active {
    background: #409eff;
    color: #fff;
    font-weight: 600;
    i {
      color: #fff;
    }
  }
}
.ff-side-drop.ff-compact {
  // 注意：scss 中不能用 >>>（会被编译成无效的 "> > >"），必须用 ::v-deep
  ::v-deep .el-upload-dragger {
    padding: 18px 10px;
    border-radius: 10px;
  }
  ::v-deep .um-dropzone-icon {
    font-size: 30px;
  }
  ::v-deep .um-dropzone-title {
    font-size: 13px;
    margin-top: 6px;
    line-height: 1.4;
  }
  ::v-deep .um-dropzone-sub,
  ::v-deep .um-dropzone-tip {
    display: none;
  }
}
.ff-side-tip {
  font-size: 12px;
  line-height: 1.6;
  color: var(--um-text-comment);
  padding: 12px 8px 0;
  border-top: 1px dashed var(--um-panel-border);
}


// 右侧主区
.ff-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative; // 作为右下角悬浮播放器的定位参照
}
.ff-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--um-panel-border);
  background: var(--um-panel-bg);
}
.ff-tool-sep {
  width: 1px;
  height: 20px;
  background: var(--um-panel-border);
  margin: 0 4px;
}
.ff-tool-label {
  font-size: 13px;
  color: var(--um-text-main);
  font-weight: 600;
  white-space: nowrap;
}
.ff-tool-spacer {
  margin-left: auto;
}
.ff-body {
  flex: 1;
  padding: 16px;
  overflow: auto;
  min-height: 0;
  position: relative;
  &.is-dragover {
    outline: 2px dashed #409eff;
    outline-offset: -6px;
  }
}
.ff-drop-hint {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
  background: rgba(64, 158, 255, 0.08);
  border-radius: 8px;
  pointer-events: none;
}
.ff-list {
  margin-top: 16px;
}
.ff-status {
  display: flex;
  gap: 24px;
  padding: 10px 16px;
  border-top: 1px solid var(--um-panel-border);
  background: var(--um-panel-bg);
  font-size: 13px;
  color: var(--um-text-comment);
}

// 关于弹窗
.ff-about-dialog {
  .ff-about-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--um-panel-border);
    i {
      font-size: 32px;
      color: #409eff;
    }
  }
  .ff-about-name {
    font-size: 17px;
    font-weight: 700;
    color: var(--um-text-main);
  }
  .ff-about-slogan {
    margin-top: 4px;
    font-size: 13px;
    color: var(--um-text-comment);
  }
  .ff-about-row {
    display: flex;
    gap: 12px;
    padding: 14px 0;
    & + .ff-about-row {
      border-top: 1px solid var(--um-panel-border);
    }
  }
  .ff-about-label {
    width: 72px;
    flex-shrink: 0;
    font-weight: 600;
    font-size: 13px;
    color: var(--um-text-main);
  }
  .ff-about-value {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    line-height: 1.8;
    color: var(--um-text-comment);
    a {
      color: #409eff;
      margin-right: 12px;
      white-space: nowrap;
      &:hover {
        text-decoration: underline;
      }
    }
  }
  .ff-about-license {
    padding-top: 14px;
    border-top: 1px solid var(--um-panel-border);
    font-size: 12px;
    line-height: 1.8;
    color: var(--um-text-comment);
    a {
      color: #409eff;
      &:hover {
        text-decoration: underline;
      }
    }
  }
}

// 右下角可收起播放器
.ff-player {
  position: absolute;
  right: 16px;
  bottom: 52px; // 高于底部状态栏
  z-index: 20;
}
.ff-player-fab {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
.ff-player-card {
  width: 300px;
  padding: 10px 12px;
  background: var(--um-panel-bg);
  border: 1px solid var(--um-panel-border);
  border-radius: 10px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.14);
  audio {
    display: block;
    width: 100%;
  }
}
.ff-player-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.ff-player-cover {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.04);
}
.ff-player-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--um-text-comment);
  i {
    font-size: 22px;
  }
}
.ff-player-info {
  flex: 1;
  min-width: 0;
}
.ff-player-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--um-text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ff-player-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--um-text-comment);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ff-player-collapse {
  padding: 0;
  flex-shrink: 0;
}
// 自定义播放控件（替代浏览器原生 audio controls，便于贴合主题）
.ff-player-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ff-player-btn {
  flex-shrink: 0;
}
.ff-player-time {
  flex-shrink: 0;
  min-width: 36px;
  text-align: center;
  font-size: 12px;
  color: var(--um-text-comment);
  font-variant-numeric: tabular-nums;
}
.ff-player-seek {
  flex: 1;
  min-width: 0;
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  background: var(--um-panel-border);
  -webkit-appearance: none;
  appearance: none;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #409eff;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    cursor: pointer;
  }
  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #409eff;
    cursor: pointer;
  }
}

// 空状态
.um-empty {
  text-align: center;
  color: var(--um-text-comment);
  padding: 48px 0;
  border: 1px dashed var(--um-empty-border);
  border-radius: 12px;
  i {
    font-size: 48px;
    display: block;
    margin-bottom: 12px;
  }
  p {
    margin: 0;
    font-size: 13px;
  }
}

.mp3-progress-mask {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
}
.mp3-progress-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px 32px;
  text-align: center;
  min-width: 280px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}
.mp3-progress-title {
  font-weight: 600;
  margin-bottom: 12px;
  font-size: 16px;
}
.mp3-progress-text {
  margin-top: 12px;
  word-break: break-all;
  color: #606266;
}

// 设置弹窗
.ff-set-dialog {
  .ff-set-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px 4px;
    & + .ff-set-row {
      border-top: 1px solid var(--um-panel-border);
    }
  }
  .ff-set-label {
    width: 72px;
    flex-shrink: 0;
    font-weight: 600;
    color: var(--um-text-main);
  }
}
</style>

<script>
import FileSelector from '@/component/FileSelector';
import PreviewTable from '@/component/PreviewTable';
import ConfigDialog from '@/component/ConfigDialog';
import EditDialog from '@/component/EditDialog';
import config from '@/../package.json';

import { DownloadBlobMusic, FilenamePolicy, FilenamePolicies, GetDownloadFilename, RemoveBlobMusic, DirectlyWriteFile } from '@/utils/utils';
import { GetImageFromURL, RewriteMetaToMp3, RewriteMetaToFlac, AudioMimeType, split_regex } from '@/decrypt/utils';
import { parseBlob as metaParseBlob } from 'music-metadata-browser';
import { transcodeToMp3 } from '@/utils/transcode';
import JSZip from 'jszip';

export default {
  name: 'Home',
  components: {
    FileSelector,
    PreviewTable,
    ConfigDialog,
    EditDialog,
  },
  data() {
    return {
      showConfigDialog: false,
      showSettingsDialog: false,
      showAboutDialog: false,
      showEditDialog: false,
      version: config.version,
      editing_data: { picture: '', title: '', artist: '', album: '', albumartist: '', genre: '' },
      tableData: [],
      playing_url: '',
      playing_auto: false,
      filename_policy: FilenamePolicy.ArtistAndTitle,
      instant_save: false,
      FilenamePolicies,
      dir: null,
      selectedRows: [],
      outputFormat: 'original', // 'original' | 'mp3'
      mp3ProgressVisible: false,
      mp3Progress: 0,
      mp3ProgressError: false,
      mp3ProgressText: '',
      dragDepth: 0,
      playerExpanded: false,
      playing_row: null,
      isPlaying: false,
      currentTime: 0,
      playerDuration: 0,
    };
  },
  computed: {
    dragOver() {
      return this.dragDepth > 0;
    },
    currentYear() {
      return new Date().getFullYear();
    },
    playingCover() {
      return (this.playing_row && this.playing_row.picture) || '';
    },
    playingTitle() {
      return (this.playing_row && this.playing_row.title) || '暂无播放';
    },
    playingSub() {
      if (!this.playing_row) return '点击列表中文件的播放按钮开始试听';
      const parts = [this.playing_row.artist, this.playing_row.album].filter((v) => !!v);
      return parts.length ? parts.join(' · ') : String(this.playing_row.ext || '').toUpperCase();
    },
    // 进度条已播放部分的渐变背景
    seekStyle() {
      const percent = this.playerDuration
        ? Math.min(100, (this.currentTime / this.playerDuration) * 100)
        : 0;
      return {
        background: `linear-gradient(to right, #409eff ${percent}%, var(--um-panel-border) ${percent}%)`,
      };
    },
  },
  watch: {
    instant_save(val) {
      if (val) this.showDirectlySave();
    },
  },
  methods: {
    async showSuccess(data) {
      if (this.instant_save) {
        await this.saveFile(data);
        RemoveBlobMusic(data);
      } else {
        this.tableData.push(data);
        this.$notify.success({
          title: '解锁成功',
          message: '成功解锁 ' + data.title,
          duration: 3000,
        });
      }
      if (process.env.NODE_ENV === 'production') {
        let _rp_data = [data.title, data.artist, data.album];
        window._paq.push(['trackEvent', 'Unlock', data.rawExt + ',' + data.mime, JSON.stringify(_rp_data)]);
      }
    },
    showFail(errInfo, filename) {
      console.error(errInfo, filename);
      this.$notify.error({
        title: '出现问题',
        message:
          errInfo +
          '，' +
          filename +
          '，参考<a target="_blank" href="https://git.unlock-music.dev/um/web/wiki/使用提示">使用提示</a>',
        dangerouslyUseHTMLString: true,
        duration: 6000,
      });
      if (process.env.NODE_ENV === 'production') {
        window._paq.push(['trackEvent', 'Error', String(errInfo), filename]);
      }
    },
    changePlaying(row) {
      // row：当前播放的完整行数据（含封面、歌名、歌手、专辑等）
      this.playing_row = row;
      this.playing_url = row ? row.file : '';
      this.playing_auto = true;
      this.playerExpanded = true; // 播放时自动展开
      this.currentTime = 0;
      this.playerDuration = 0;
    },
    // === 自定义播放器控件 ===
    togglePlay() {
      const audio = this.$refs.audioEl;
      if (!audio || !this.playing_url) return;
      if (audio.paused) {
        audio.play();
      } else {
        audio.pause();
      }
    },
    onAudioMeta() {
      const audio = this.$refs.audioEl;
      if (audio && isFinite(audio.duration)) this.playerDuration = audio.duration;
    },
    onAudioTime() {
      const audio = this.$refs.audioEl;
      if (audio) this.currentTime = audio.currentTime;
    },
    onSeek(e) {
      const audio = this.$refs.audioEl;
      const value = Number(e.target.value);
      this.currentTime = value;
      if (audio) audio.currentTime = value;
    },
    fmtTime(sec) {
      if (!sec || !isFinite(sec)) return '0:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${m}:${String(s).padStart(2, '0')}`;
    },
    // 右侧任务区拖放：复用左侧 FileSelector 的解密队列
    onDragEnter() {
      this.dragDepth++;
    },
    onDragLeave() {
      this.dragDepth = Math.max(0, this.dragDepth - 1);
    },
    onBodyDrop(e) {
      this.dragDepth = 0;
      const files = Array.from((e.dataTransfer && e.dataTransfer.files) || []);
      if (!files.length) return;
      const selector = this.$refs.fileSelector;
      if (!selector) return;
      files.forEach((f) => {
        // Decrypt 只使用 file.name 与 file.raw，与 el-upload 传入的形态一致
        selector.addFile({ name: f.name, raw: f, size: f.size, uid: Date.now() + Math.random() });
      });
    },
    handleDeleteAll() {
      this.tableData.forEach((value) => {
        RemoveBlobMusic(value);
      });
      this.tableData = [];
      this.selectedRows = [];
    },
    onSelectionChange(rows) {
      this.selectedRows = rows;
    },
    handleDownloadSelected() {
      if (this.selectedRows.length === 0) return;
      this.downloadWithFormat(this.selectedRows.slice());
    },
    handleDeleteSelected() {
      const list = this.selectedRows.slice();
      list.forEach((value) => {
        RemoveBlobMusic(value);
        const i = this.tableData.indexOf(value);
        if (i > -1) this.tableData.splice(i, 1);
      });
      this.selectedRows = [];
    },
    handleDownloadAll() {
      this.downloadWithFormat(this.tableData.slice());
    },
    // 按当前「输出格式」导出：single=单文件直接保存，否则打包 ZIP
    downloadWithFormat(list, mode = 'zip') {
      if (!list.length) return;
      const asMp3 = this.outputFormat === 'mp3';
      if (mode === 'single' && list.length === 1) {
        this.saveFile(list[0], asMp3);
      } else {
        this.downloadAsZip(list, asMp3);
      }
    },
    async downloadAsZip(list, asMp3 = false) {
      if (!list.length) return;
      this.mp3ProgressVisible = asMp3;
      this.mp3ProgressError = false;
      this.mp3Progress = 0;
      this.mp3ProgressText = `正在打包 ${list.length} 个文件...`;
      await this.$nextTick();
      const mp3Start = Date.now();
      const closeProgress = async () => {
        const wait = 600 - (Date.now() - mp3Start);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        this.mp3ProgressVisible = false;
      };
      try {
        const zip = new JSZip();
        const used = {};
        const total = list.length;
        let done = 0;
        for (const item of list) {
          let out = item;
          if (asMp3 && item.ext !== 'mp3') {
            try {
              const mp3Blob = await transcodeToMp3(item.blob, 128, (p) => {
                const per = ((done + p / 100) / total) * 100;
                this.mp3Progress = Math.round(per);
                this.mp3ProgressText = `正在转换 (${done + 1}/${total})：${item.title} ${p}%`;
              });
              out = { ...item, blob: mp3Blob, ext: 'mp3' };
            } catch (e) {
              console.error('MP3 转码失败，回退原始格式', e);
            }
          }
          let name = GetDownloadFilename(out, this.filename_policy);
          if (used[name]) {
            name = `${used[name]} - ${name}`;
          }
          used[name] = (used[name] || 0) + 1;
          zip.file(name, out.blob);
          done++;
          this.mp3Progress = Math.round((done / total) * 100);
          this.mp3ProgressText = asMp3 ? `已处理 ${done}/${total}，正在生成 ZIP...` : `已打包 ${done}/${total}`;
        }
        const content = await zip.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        const stamp = new Date().toISOString().slice(0, 10);
        a.download = `音乐解锁_${stamp}.zip`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        await closeProgress();
        this.$notify.success({
          title: '打包完成',
          message: `已下载 ${list.length} 个文件的 ZIP 压缩包`,
          duration: 3000,
        });
      } catch (e) {
        await closeProgress();
        console.error(e);
        this.$notify.error({
          title: '打包失败',
          message: '生成 ZIP 时发生错误：' + e,
          duration: 4000,
        });
      }
    },
    async handleEdit(data) {
      this.showEditDialog = false;
      URL.revokeObjectURL(this.editing_data.file);
      if (data.picture) {
        URL.revokeObjectURL(this.editing_data.picture);
        this.editing_data.picture = URL.createObjectURL(data.picture);
      }
      this.editing_data.title = data.title;
      this.editing_data.artist = data.artist;
      this.editing_data.album = data.album;
      let writeSuccess = true;
      let notifyMsg = '成功修改 ' + this.editing_data.title;
      try {
        const musicMeta = await metaParseBlob(new Blob([this.editing_data.blob], { type: mime }));
        let imageInfo = undefined;
        if (this.editing_data.picture !== '') {
          imageInfo = await GetImageFromURL(this.editing_data.picture);
          if (!imageInfo) {
            console.warn('获取图像失败', this.editing_data.picture);
          }
        }
        const newMeta = {
          picture: imageInfo?.buffer,
          title: data.title,
          artists: data.artist.split(split_regex),
          album: data.album,
          albumartist: data.albumartist,
          genre: data.genre.split(split_regex),
        };
        const buffer = Buffer.from(await this.editing_data.blob.arrayBuffer());
        const mime = AudioMimeType[this.editing_data.ext] || AudioMimeType.mp3;
        if (this.editing_data.ext === 'mp3') {
          this.editing_data.blob = new Blob([RewriteMetaToMp3(buffer, newMeta, musicMeta)], { type: mime });
        } else if (this.editing_data.ext === 'flac') {
          this.editing_data.blob = new Blob([RewriteMetaToFlac(buffer, newMeta, musicMeta)], { type: mime });
        } else {
          writeSuccess = undefined;
          notifyMsg = this.editing_data.ext + '类型文件暂时不支持修改音乐标签';
        }
      } catch (e) {
        writeSuccess = false;
        notifyMsg = '修改' + this.editing_data.title + '未能完成。在写入新的元数据时发生错误：' + e;
      }
      this.editing_data.file = URL.createObjectURL(this.editing_data.blob);
      if (writeSuccess === true) {
        this.$notify.success({
          title: '修改成功',
          message: notifyMsg,
          duration: 3000,
        });
      } else if (writeSuccess === false) {
        this.$notify.error({
          title: '修改失败',
          message: notifyMsg,
          duration: 3000,
        });
      } else {
        this.$notify.warning({
          title: '修改取消',
          message: notifyMsg,
          duration: 3000,
        });
      }
    },

    async editFile(data) {
      this.editing_data = data;
      const musicMeta = await metaParseBlob(this.editing_data.blob);
      this.editing_data.albumartist = musicMeta.common.albumartist || '';
      this.editing_data.genre = musicMeta.common.genre?.toString() || '';
      this.showEditDialog = true;
    },
    async saveFile(data, asMp3) {
      let out = data;
      const wantMp3 = asMp3 ?? false;
      if (wantMp3 && data.ext !== 'mp3') {
        this.mp3ProgressVisible = true;
        this.mp3ProgressError = false;
        this.mp3Progress = 0;
        this.mp3ProgressText = '正在转换为 MP3：' + data.title;
        await this.$nextTick();
        const mp3Start = Date.now();
        try {
          const mp3Blob = await transcodeToMp3(data.blob, 128, (p) => {
            this.mp3Progress = p;
            this.mp3ProgressText = `正在转换为 MP3：${data.title} (${p}%)`;
          });
          const file = URL.createObjectURL(mp3Blob);
          out = { ...data, blob: mp3Blob, ext: 'mp3', file };
        } catch (e) {
          console.error('MP3 转码失败，回退原始格式', e);
          this.mp3ProgressError = true;
          this.$notify.warning({
            title: 'MP3 转码失败',
            message: '已使用原始格式下载 ' + data.title,
            duration: 3000,
          });
        } finally {
          const wait = 600 - (Date.now() - mp3Start);
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          this.mp3ProgressVisible = false;
        }
      }
      if (this.dir) {
        await DirectlyWriteFile(out, this.filename_policy, this.dir);
        this.$notify({
          title: '保存成功',
          message: out.title,
          position: 'top-left',
          type: 'success',
          duration: 3000,
        });
      } else {
        DownloadBlobMusic(out, this.filename_policy);
      }
      if (out !== data) {
        setTimeout(() => URL.revokeObjectURL(out.file), 2000);
      }
    },
    async showDirectlySave() {
      if (!window.showDirectoryPicker) return;
      try {
        await this.$confirm('您的浏览器支持文件直接保存到磁盘，是否使用？', '新特性提示', {
          confirmButtonText: '使用',
          cancelButtonText: '不使用',
          type: 'warning',
          center: true,
        });
      } catch (e) {
        console.log(e);
        return;
      }
      try {
        this.dir = await window.showDirectoryPicker();
        const test_filename = '__unlock_music_write_test.txt';
        await this.dir.getFileHandle(test_filename, { create: true });
        await this.dir.removeEntry(test_filename);
      } catch (e) {
        console.error(e);
      }
    },
  },
};
</script>
