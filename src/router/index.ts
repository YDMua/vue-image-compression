import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import ImageCompress from "../views/ImageCompress.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "ImageCompress",
    component: ImageCompress,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
