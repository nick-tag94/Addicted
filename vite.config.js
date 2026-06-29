import { defineConfig } from "vite";
import { resolve } from "path";
import { createHtmlPlugin } from "vite-plugin-html";
import fs from "fs";
import { compile } from "sass";

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
          const normalizeBuiltCssAssetPaths = (cssPath) => {
            if (!fs.existsSync(cssPath)) return;

            const cssContent = fs.readFileSync(cssPath, "utf-8");
            const normalizedCssContent = cssContent
              .replaceAll("url(/assets/icon/", "url(../assets/icon/")
              .replaceAll("url(/assets/", "url(../assets/");

            fs.writeFileSync(cssPath, normalizedCssContent);
          };

          fs.rmSync(resolve(__dirname, "build/components"), {
            recursive: true,
            force: true,
          });
          fs.rmSync(resolve(__dirname, "build/Components"), {
            recursive: true,
            force: true,
          });

          const buildDir = resolve(__dirname, "build");
          const mainCssPath = resolve(__dirname, "build/assets/main.css");
          const main2vCssPath = resolve(__dirname, "build/assets/main-2v.css");
          const main3vCssPath = resolve(__dirname, "build/assets/main-3v.css");
          const builtHtmlFiles = fs
            .readdirSync(buildDir)
            .filter((fileName) => fileName.endsWith(".html"));

          const writeCompiledStyle = (sourceFilePath, outputFilePath) => {
            const compiledStyle = compile(sourceFilePath, {
              style: "compressed",
              loadPaths: [resolve(__dirname, "src/scss")],
            });

            fs.writeFileSync(outputFilePath, compiledStyle.css);
          };

          writeCompiledStyle(
            resolve(__dirname, "src/scss/main-2v.scss"),
            main2vCssPath,
          );
          writeCompiledStyle(
            resolve(__dirname, "src/scss/main-3v.scss"),
            main3vCssPath,
          );

          normalizeBuiltCssAssetPaths(mainCssPath);
          normalizeBuiltCssAssetPaths(main2vCssPath);
          normalizeBuiltCssAssetPaths(main3vCssPath);

          builtHtmlFiles.forEach((fileName) => {
            const filePath = resolve(buildDir, fileName);
            const html = fs.readFileSync(filePath, "utf-8");
            const updatedHtml = html.replace(
              '<link rel="stylesheet" crossorigin href="/assets/main.css">',
              '<link rel="stylesheet" crossorigin href="/assets/main.css"><link rel="stylesheet" crossorigin href="/assets/main-2v.css"><link rel="stylesheet" crossorigin href="/assets/main-3v.css">',
            );

            fs.writeFileSync(filePath, updatedHtml);
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
          {
            filename: "checkout",
            template: "checkout.html",
            injectOptions: {
              data: {
                title: "Addicted - Оформление заказа",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "basket-stub",
            template: "basket-stub.html",
            injectOptions: {
              data: {
                title: "Addicted - Корзина пуста",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "order-success",
            template: "order-success.html",
            injectOptions: {
              data: {
                title: "Addicted - Заказ оформлен",
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
            filename: "shop",
            template: "shop.html",
            injectOptions: {
              data: {
                title: "Addicted - Магазины",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "login",
            template: "login.html",
            injectOptions: {
              data: {
                title: "Addicted - Вход в аккаунт",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "registration",
            template: "registration.html",
            injectOptions: {
              data: {
                title: "Addicted - Регистрация",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "password-recovery",
            template: "password-recovery.html",
            injectOptions: {
              data: {
                title: "Addicted - Восстановление пароля",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "404",
            template: "404.html",
            injectOptions: {
              data: {
                title: "Addicted - 404",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
          {
            filename: "account",
            template: "account.html",
            injectOptions: {
              data: {
                title: "Addicted - Мой кабинет",
                assetBase: basePath,
                header: sharedComponentTokens.header,
                footer: sharedComponentTokens.footer,
              },
            },
          },
                    {
            filename: "orders",
            template: "orders.html",
            injectOptions: {
              data: {
                title: "Addicted - Мои заказы",
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
