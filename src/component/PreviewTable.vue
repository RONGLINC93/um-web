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
      <el-table-column label="原格式" width="84">
        <template #default="scope">
          <el-tag size="mini" type="info">{{ (scope.row.rawExt || scope.row.ext || '-').toUpperCase() }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="格式" width="72">
        <template #default="scope">
          <el-tag size="mini" :type="scope.row.ext ? '' : 'info'">
            {{ scope.row.ext ? String(scope.row.ext).toUpperCase() : '-' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="scope">
          <el-tag size="mini" :type="statusType(scope.row._status)" :class="{ 'is-blink': scope.row._status === 'processing' }">
            {{ statusText(scope.row._status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="176">
        <template #default="scope">
          <div class="ops">
            <el-button size="mini" circle icon="el-icon-video-play" type="success" :disabled="scope.row._status !== 'done'" @click="handlePlay(scope.$index, scope.row)" />
            <el-button size="mini" circle icon="el-icon-download" :disabled="scope.row._status !== 'done'" @click="handleDownload(scope.row)" />
            <el-button size="mini" circle icon="el-icon-edit" :disabled="scope.row._status !== 'done'" @click="handleEdit(scope.row)" />
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
    statusText(status) {
      switch (status) {
        case 'queued':
          return '排队解锁中';
        case 'processing':
          return '正在解锁中';
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
          return 'warning';
        case 'done':
          return 'success';
        case 'failed':
          return 'danger';
        default:
          return 'info';
      }
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
      if (row._status !== 'done') return;
      this.$emit('download', row);
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

// 「正在解锁中」状态轻微呼吸提示
.is-blink {
  animation: um-status-blink 1.4s ease-in-out infinite;
}
@keyframes um-status-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
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
