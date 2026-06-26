<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const config = {
  particles: {
    number: {
      value: 50,
      density: {
        enable: true,
        value_area: 1000
      }
    },
    color: {
      value: ["#38bdf8", "#0ea5e9", "#7dd3fc"]
    },
    shape: {
      type: "circle",
      stroke: {
        width: 0,
        color: "#fff"
      },
      polygon: {
        nb_sides: 5
      }
    },
    opacity: {
      value: 0.5,
      random: false,
      anim: {
        enable: false,
        speed: 1,
        opacity_min: 0.1,
        sync: false
      }
    },
    size: {
      value: 3,
      random: true,
      anim: {
        enable: false,
        speed: 5,
        size_min: 0.1,
        sync: true
      }
    },
    line_linked: {
      enable: true,
      distance: 200,
      color: "#0ea5e9",
      opacity: 0.1,
      width: 1
    },
    move: {
      enable: true,
      speed: 0.3,
      direction: "none",
      random: false,
      straight: false,
      out_mode: "out",
      bounce: false,
      attract: {
        enable: false,
        rotateX: 600,
        rotateY: 1200
      }
    }
  },
  interactivity: {
    detect_on: "canvas",
    events: {
      onhover: {
        enable: true,
        mode: "grab"
      },
      onclick: {
        enable: true,
        mode: "push"
      },
      resize: true
    },
    modes: {
      grab: {
        distance: 140,
        line_linked: {
          opacity: 0.8
        }
      },
      bubble: {
        distance: 400,
        size: 40,
        duration: 2,
        opacity: 8,
        speed: 3
      },
      repulse: {
        distance: 200,
        duration: 0.4
      },
      push: {
        particles_nb: 1
      },
      remove: {
        particles_nb: 2
      }
    }
  },
  retina_detect: true
}

let scriptEl: HTMLScriptElement | null = null

onMounted(() => {
  const initParticles = () => {
    const pJS = (window as any).particlesJS
    if (pJS) {
      pJS('particles-js', config)
    }
  }

  if ((window as any).particlesJS) {
    initParticles()
  } else {
    // Dynamically load the particles script
    scriptEl = document.createElement('script')
    scriptEl.src = '/particles.min.js'
    scriptEl.async = true
    scriptEl.onload = initParticles
    document.head.appendChild(scriptEl)
  }
})

onUnmounted(() => {
  if (scriptEl && scriptEl.parentNode) {
    scriptEl.parentNode.removeChild(scriptEl)
  }
  const canvas = document.querySelector('#particles-js canvas')
  if (canvas) {
    canvas.remove()
  }
})
</script>

<template>
  <div id="particles-js" class="particles-bg" />
</template>

<style scoped>
#particles-js {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  opacity: 0.8;
  background-color: transparent;
}
</style>
