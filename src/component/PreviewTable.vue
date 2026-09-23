<template>
  <div class="preview-table">
    <el-table
      :data="tableData"
      height="100%"
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="40" />
      <el-table-column label="封面" width="76">
        <template slot-scope="scope">
          <el-image class="cover" :src="scope.row.picture">
            <div slot="error" class="image-slot el-image__error">暂无封面</div>
          </el-image>
        </template>
      </el-table-column>
      <el-table-column label="歌曲" min-width="120" show-overflow-tooltip>
        <template #default="scope">
          <span>{{ scope.row.title }}</span>
        </template>
      </el-table-column>
      <el-table-column label="歌手" min-width="100" show-overflow-tooltip>
        <template #default="scope">
          <span>{{ scope.row.artist }}</span>
        </template>
      </el-table-column>
      <el-table-column label="专辑" min-width="120" show-overflow-tooltip class-name="col-album" label-class-name="col-album">
        <template #default="scope">
          <span>{{ scope.row.album }}</span>
        </template>
      </el-table-column>
      <el-table-column label="加密格式" width="92">
        <template #default="scope">
          <span class="fmt-chip">
            <i class="fmt-dot" :class="'dot-' + (rawExtTagType(scope.row.rawExt) || 'default')" />
            {{ (scope.row.rawExt || '-').toUpperCase() }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="格式" width="80">
        <template #default="scope">
          <span v-if="scope.row.ext" class="fmt-chip" :class="'fmt-' + String(scope.row.ext).toLowerCase()">
            {{ String(scope.row.ext).toUpperCase() }}
          </span>
          <span v-else class="fmt-empty">-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" min-width="150">
        <template #default="scope">
          <div class="um-status">
            <el-tag size="mini" :type="statusType(scope.row._status)">{{ statusText(scope.row._status) }}</el-tag>
            <el-progress
              v-if="showProgressBar(scope.row._status)"
              class="um-status-bar"
              :class="{ 'is-indeterminate': scope.row._status === 'processing' }"
              :percentage="statusPercent(scope.row)"
              :status="progressStatus(scope.row._status)"
              :stroke-width="scope.row._status === 'converting' ? 12 : 6"
              :text-inside="scope.row._status === 'converting'"
              :show-text="scope.row._status === 'converting'"
            />
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="176">
        <template #default="scope">
          <div class="ops">
            <el-button size="mini" circle icon="el-icon-video-play" type="success" :disabled="!isReady(scope.row)" @click="handlePlay(scope.$index, scope.row)" />
            <el-button size="mini" circle icon="el-icon-download" :disabled="!isReady(scope.row)" @click="handleDownload(scope.row)" />
            <el-button
              v-if="scope.row._status === 'converting' || scope.row._status === 'convert-queued'"
              size="mini"
              circle
              icon="el-icon-close"
              type="danger"
              title="取消转换"
              @click="handleCancelConvert(scope.row)"
            />
            <el-button
              v-else
              size="mini"
              circle
              icon="el-icon-refresh-right"
              type="warning"
              title="转为 MP3"
              :disabled="!isReady(scope.row) || scope.row.ext === 'mp3'"
              @click="handleConvert(scope.row)"
            />
            <el-button size="mini" circle icon="el-icon-edit" :disabled="!isReady(scope.row)" @click="handleEdit(scope.row)" />
            <el-button size="mini" circle icon="el-icon-delete" type="danger" @click="handleDelete(scope.$index, scope.row)" />
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import { RemoveBlobMusic } from '@/utils/utils';

export default {
  name: 'PreviewTable',
  props: {
    tableData: { type: Array, required: true },
    policy: { type: Number, required: true },
  },

  methods: {
    // 加密格式：按所属平台着色（深色徽章）
    rawExtTagType(ext) {
      const e = String(ext || '').toLowerCase();
      if (!e) return 'info';
      if (e === 'ncm' || e === 'uc') return 'danger'; // 网易云
      if (e === 'kgm' || e === 'kgma' || e === 'vpr') return ''; // 酷狗（默认蓝）
      if (e === 'xm') return 'warning'; // 虾米
      if (e === 'x2m' || e === 'x3m') return 'warning'; // 喜马拉雅
      if (e === 'kwm') return 'info'; // 酷我
      if (e === 'mg3d') return 'danger'; // 咪咕
      if (e === 'ofl_en') return 'info'; // JOOX
      // QQ 音乐 / Moo 音乐（qmc*、mflac*、mgg*、tm*、bkc*、tkm、cache、微云十六进制名）
      if (
        e.startsWith('qmc') ||
        e.startsWith('mflac') ||
        e.startsWith('mgg') ||
        e.startsWith('tm') ||
        e.startsWith('bkc') ||
        e === 'tkm' ||
        e === 'cache' ||
        /^[0-9a-f]{6}$/.test(e)
      ) {
        return 'success';
      }
      return 'info';
    },
    statusText(status) {
      switch (status) {
        case 'queued':
          return '排队解锁中';
        case 'processing':
          return '正在解锁中';
        case 'converting':
          return '转换 MP3 中';
        case 'convert-queued':
          return '等待转换 MP3';
        case 'converted':
          return 'MP3 转换完成';
        case 'done':
          return '解锁完成';
        case 'failed':
          return '解锁失败';
        default:
          return '排队解锁中';
      }
    },
    statusType(status) {
      switch (status) {
        case 'queued':
          return 'info';
        case 'processing':
        case 'converting':
          return 'warning';
        case 'done':
        case 'converted':
          return 'success';
        case 'failed':
          return 'danger';
        default:
          return 'info';
      }
    },
    // MP3 转码有真实百分比，其余状态用固定值/不定长动画表示
    statusPercent(row) {
      if (row._status === 'converting') return Math.round(row._progress || 0);
      switch (row._status) {
        case 'done':
        case 'converted':
        case 'failed':
          return 100;
        case 'processing':
          return 60; // 单文件解密无中间进度，用不定长动画表示进行中
        default:
          return 0;
      }
    },
    // 只在「正在解锁中 / 正在转换中」显示进度条；排队与终态都不显示
    showProgressBar(status) {
      return status === 'processing' || status === 'converting';
    },
    progressStatus(status) {
      if (status === 'failed') return 'exception';
      if (status === 'done' || status === 'converted') return 'success';
      return '';
    },
    isReady(row) {
      return row._status === 'done' || row._status === 'converted';
    },
    handleSelectionChange(val) {
      this.$emit('selection-change', val);
    },
    handlePlay(index, row) {
      // 传出整行数据，便于播放器展示封面/歌名/歌手等信息
      this.$emit('play', row);
    },
    handleDelete(index, row) {
      RemoveBlobMusic(row);
      this.tableData.splice(index, 1);
    },
    handleDownload(row) {
      if (!this.isReady(row)) return;
      this.$emit('download', row);
    },
    handleCancelConvert(row) {
      this.$emit('cancel-convert', row);
    },
    handleConvert(row) {
      if (!this.isReady(row) || row.ext === 'mp3') return;
      this.$emit('convert', row);
    },
    handleEdit(row) {
      this.$emit('edit', row);
    },
  },
};
</script>

<style lang="scss" scoped>
// 填满父级弹性容器，表格内部滚动
.preview-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  ::v-deep .el-table {
    flex: 1;
    min-height: 0;
  }
}
// 紧凑化：缩小单元格内边距与行高
// 注意：scss 中不能用 >>>（会被编译成无效的 "> > >"），必须用 ::v-deep
.preview-table ::v-deep .el-table td,
.preview-table ::v-deep .el-table th {
  padding: 5px 0;
}
.preview-table ::v-deep .el-table .cell {
  padding-left: 8px;
  padding-right: 8px;
  line-height: 1.4;
}

// 封面缩小
.cover {
  width: 48px;
  height: 48px;
  border-radius: 4px;
  display: block;
}
.image-slot.el-image__error {
  font-size: 11px;
  line-height: 1.2;
  padding: 0 2px;
}

// 操作按钮保持一行，不换行
.ops {
  white-space: nowrap;
  .el-button + .el-button {
    margin-left: 6px;
  }
}

// 轻量「芯片」式格式徽章：淡色底 + 1px 描边 + 同色文字，深色/浅色主题都协调
.fmt-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 20px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid rgba(144, 147, 153, 0.32);
  background: rgba(144, 147, 153, 0.12);
  color: #b8bec7;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.4px;
  line-height: 1;
  white-space: nowrap;
}
// 平台色圆点（加密格式列）
.fmt-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #909399;
  flex: none;
}
.dot-default {
  background: #409eff; // 酷狗
}
.dot-success {
  background: #67c23a; // QQ / Moo
}
.dot-warning {
  background: #e6a23c; // 虾米 / 喜马拉雅
}
.dot-danger {
  background: #f56c6c; // 网易云 / 咪咕
}
.dot-info {
  background: #909399; // 酷我 / JOOX
}
// 每种音频编码一种淡色配色
.fmt-mp3 {
  background: rgba(76, 175, 80, 0.14);
  border-color: rgba(76, 175, 80, 0.38);
  color: #7cc47f;
}
.fmt-flac {
  background: rgba(66, 153, 225, 0.14);
  border-color: rgba(66, 153, 225, 0.4);
  color: #6cb6ff;
}
.fmt-wav {
  background: rgba(255, 167, 38, 0.14);
  border-color: rgba(255, 167, 38, 0.4);
  color: #ffb74d;
}
.fmt-m4a {
  background: rgba(171, 71, 188, 0.14);
  border-color: rgba(171, 71, 188, 0.4);
  color: #ce93d8;
}
.fmt-ogg {
  background: rgba(38, 166, 154, 0.14);
  border-color: rgba(38, 166, 154, 0.4);
  color: #4db6ac;
}
.fmt-ape {
  background: rgba(141, 110, 99, 0.16);
  border-color: rgba(141, 110, 99, 0.42);
  color: #bcaaa4;
}
.fmt-empty {
  color: var(--um-text-comment, #909399);
}

// 行内状态：文字标签 + 进度条
.um-status {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}
.um-status-bar {
  width: 100%;
  line-height: 1;
  ::v-deep .el-progress-bar__outer {
    overflow: hidden;
  }
  ::v-deep .el-progress__text {
    display: none;
  }
}
// 单文件解密没有中间进度，用滑动动画表示「进行中」
.um-status-bar.is-indeterminate {
  ::v-deep .el-progress-bar__inner {
    width: 40% !important;
    animation: um-progress-slide 1.2s ease-in-out infinite;
  }
}
@keyframes um-progress-slide {
  0% {
    margin-left: -40%;
  }
  100% {
    margin-left: 100%;
  }
}

// ============ 移动端适配 ============
@media (max-width: 768px) {
  // 窄屏隐藏「专辑」列，避免横向溢出过多
  ::v-deep .col-album {
    display: none;
  }
  // 封面与单元格进一步紧凑
  .cover {
    width: 40px;
    height: 40px;
  }
  ::v-deep .el-table td,
  ::v-deep .el-table th {
    padding: 4px 0;
  }
  ::v-deep .el-table .cell {
    padding-left: 6px;
    padding-right: 6px;
  }
}
</style>
