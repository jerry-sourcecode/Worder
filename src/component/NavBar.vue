<template>
	<el-menu default-active="/wordBook" router>
		<el-menu-item index="/study">
			<el-icon><EditPen /></el-icon>
			<span>学习</span>
		</el-menu-item>
		<el-menu-item index="/review">
			<el-icon><Reading /></el-icon>
			<span>复习</span>
		</el-menu-item>
		<el-menu-item index="/wordBook">
			<el-icon><Notebook /></el-icon>
			<span>单词本</span>
		</el-menu-item>
		<el-menu-item index="/setting">
			<el-icon><setting /></el-icon>
			<span>设置</span>
		</el-menu-item>
	</el-menu>
</template>

<script setup lang="ts"></script>

<style scoped></style>
