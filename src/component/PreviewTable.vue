<template>
  <div class="preview-table">
    <el-table
      :data="tableData"
      :max-height="maxHeight"
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
      <el-table-column label="专辑" min-width="120" show-overflow-tooltip>
        <template #default="scope">
          <span>{{ scope.row.album }}</span>
        </template>
      </el-table-column>
      <el-table-column label="格式" width="72">
        <template #default="scope">
          <el-tag size="mini" type="info">{{ scope.row.ext.toUpperCase() }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="176">
        <template #default="scope">
          <div class="ops">
            <el-button size="mini" circle icon="el-icon-video-play" type="success" @click="handlePlay(scope.$index, scope.row)" />
            <el-button size="mini" circle icon="el-icon-download" @click="handleDownload(scope.row)" />
            <el-button size="mini" circle icon="el-icon-edit" @click="handleEdit(scope.row)" />
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
    // 列表可视高度上限（px），超出后表格内部滚动，表头保持吸顶
    maxHeight: { type: [Number, String], default: 440 },
  },

  methods: {
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
      this.$emit('download', row);
    },
    handleEdit(row) {
      this.$emit('edit', row);
    },
  },
};
</script>

<style lang="scss" scoped>
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
</style>
