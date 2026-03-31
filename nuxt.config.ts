import { _light } from "#tailwind-config/theme/fontWeight";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  nuxtMarkdownRender: {
    // as: 'article', // default 'div'
    // component: 'NotNuxtMarkdown', // false to disable Nuxt's auto import
    options: {
      html: false // default true
    },
    plugins: {
      mdc: false, // default mdc options object
      anchor: {
        level: 1
      },
      shiki: {
        themes: {
          light: "github-light",
          dark: "dark-plus"
        },
        langs: [
          "php",
          "sql",
          "html",
          "js",
          "ts",
          "vue",
          "http"
        ]
      }
    },
    vueRuntimeCompiler: false // default true
  },
  app: {
    pageTransition: { name: 'fade', mode: 'out-in' },
    head: {
      link: [{ rel: 'icon', href: '/logo.svg' }],
      "meta": [
        {
          "name": "viewport",
          "content": "width=device-width, initial-scale=1"
        },
        {
          "charset": "utf-8"
        }
      ],
    }
  },
  modules: ['@nuxt/ui', '@pinia/nuxt', "@nuxt/content", "@nuxtjs/tailwindcss", 'nuxt-markdown-render', '@nuxtjs/color-mode'],
  colorMode: {
    classSuffix: 'selector'
  },
  content: {
    ignores: [
      '\<input\>',
      '\<script\>'
    ],
    markdown: {
      anchorLinks: false,
      toc: {
        depth: 6,
        searchDepth: 6
      }
    },
    highlight: {
      theme: {
        default: "github-light",
        dark: "dark-plus"
      },
      langs: [
        "php",
        "sql",
        "html",
        "js",
        "ts",
        "vue",
        "http"
      ]
    },
  },
  nitro: {
    experimental: {
      database: true
    }
  },
  pinia: {
    storesDirs: ['./stores/**', './custom-folder/stores/**'],
  },
  imports: {
    dirs: ['types/*.ts', 'store/*.ts', 'types/**/*.ts'],
  },
  components: [{
    path: '~/components',
    pathPrefix: false,
  }],

})
