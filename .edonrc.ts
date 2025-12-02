import { defineConfig } from "edon-service";
export default defineConfig({
  entryPath: "src/main.ts",
  // html: {
  //   template: "index.html",
  // },
  framework: "vue",
  tailwind: true,
  chainWebpack: async (config, options) => {
    return config;
  },
});
