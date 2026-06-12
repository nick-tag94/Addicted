import { defineConfig } from "vite";
import { resolve } from "path";
import { createHtmlPlugin } from "vite-plugin-html";
import fs from "fs";

const readFile = (filePath) =>
  fs.readFileSync(resolve(__dirname, filePath), "utf-8");

const sharedComponents = {
  header: "public/components/header.html",
  footer: "public/components/footer.html",
};

const sharedComponentTokens = {
  header: "__SHARED_HEADER__",
  footer: "__SHARED_FOOTER__",
};
const sharedComponentAssetBaseToken = "__COMPONENT_ASSET_BASE__";

const sharedComponentPaths = Object.values(sharedComponents).map((filePath) =>
  resolve(__dirname, filePath),
);

function sharedComponentsPlugin(componentAssetBase) {
  return {
    name: "shared-components",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const headerHtml = readFile(sharedComponents.header).replaceAll(
          sharedComponentAssetBaseToken,
          componentAssetBase,
        );
        const footerHtml = readFile(sharedComponents.footer).replaceAll(
          sharedComponentAssetBaseToken,
          componentAssetBase,
        );

        return html
          .replaceAll(sharedComponentTokens.header, headerHtml)
          .replaceAll(sharedComponentTokens.footer, footerHtml);
      },
    },
    configureServer(server) {
      server.watcher.add(sharedComponentPaths);

      server.watcher.on("change", (file) => {
        if (!sharedComponentPaths.includes(file)) return;

        server.ws.send({
          type: "full-reload",
        });
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const basePath = "/";
  const componentAssetBase = command === "build" ? "" : "/";

  const getAssetOutputPath = (assetInfo) => {
    const sourcePath =
      assetInfo.originalFileNames?.[0] ?? assetInfo.names?.[0] ?? "";
    const normalizedPath = sourcePath.replaceAll("\\", "/");
    const extension = normalizedPath.split(".").pop()?.toLowerCase() ?? "";
    const imageExtensions = new Set([
      "png",
      "jpg",
      "jpeg",
      "webp",
      "avif",
      "gif",
      "svg",
    ]);
    const fontExtensions = new Set(["woff", "woff2", "ttf", "eot", "otf"]);

    if (normalizedPath.endsWith(".css")) {
      return "assets/[name][extname]";
    }
    if (normalizedPath.includes("/assets/icon/")) {
      return "assets/icon/[name][extname]";
    }
    if (normalizedPath.includes("/img/") || imageExtensions.has(extension)) {
      return "img/[name][extname]";
    }
    if (fontExtensions.has(extension)) {
      return "fonts/[name][extname]";
    }

    return "assets/[name][extname]";
  };

  return {
    base: basePath,

    resolve: {
      dedupe: ["jquery"],
    },

    optimizeDeps: {
      include: ["jquery"],
    },

    server: {
      port: 3000,
      strictPort: true,
    },

    publicDir: "public",

    plugins: [
      {
        name: "remove-components-from-build",
        apply: "build",
        closeBundle() {
          fs.rmSync(resolve(__dirname, "build/components"), {
            recursive: true,
            force: true,
          });
          fs.rmSync(resolve(__dirname, "build/Components"), {
            recursive: true,
            force: true,
          });
        },
      },
      sharedComponentsPlugin(componentAssetBase),
      createHtmlPlugin({
        pages: [
          {
            filename: "index",
            template: "index.html",
            injectOptions: {
              data: {
                title: "Addicted - Главная страница",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "about",
            template: "about.html",
            injectOptions: {
              data: {
                title: "Addicted - О бренде",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "catalog",
            template: "catalog.html",
            injectOptions: {
              data: {
                title: "Addicted - Каталог",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "product",
            template: "product.html",
            injectOptions: {
              data: {
                title: "Addicted - Карточка товара",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "privacy-policy",
            template: "privacy-policy.html",
            injectOptions: {
              data: {
                title: "Addicted - Политика конфиденциальности",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "delivery-return",
            template: "delivery-return.html",
            injectOptions: {
              data: {
                title: "Addicted - Доставка и возврат",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "search",
            template: "search.html",
            injectOptions: {
              data: {
                title: "Addicted - Cтраница поиска",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "wishlist",
            template: "wishlist.html",
            injectOptions: {
              data: {
                title: "Addicted - Избранное",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "basket",
            template: "basket.html",
            injectOptions: {
              data: {
                title: "Addicted - Корзина",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
        ],
      }),
    ],

    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          assetFileNames: getAssetOutputPath,
          entryFileNames: "assets/[name].js",
          chunkFileNames: "assets/[name].js",
        },
      },
    },
  };
});
