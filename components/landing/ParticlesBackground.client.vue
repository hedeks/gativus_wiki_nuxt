<script setup lang="ts">
import { onMounted, onUnmounted, nextTick } from 'vue'

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
const instanceId = `particles-js-${Math.random().toString(36).substring(2, 9)}`

onMounted(() => {
  const initParticles = () => {
    const pJS = (window as any).particlesJS
    const el = document.getElementById(instanceId)
    if (pJS && el) {
      pJS(instanceId, config)
    }
  }

  nextTick(() => {
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
})

onUnmounted(() => {
  if (scriptEl && scriptEl.parentNode) {
    scriptEl.parentNode.removeChild(scriptEl)
  }

  // Safely stop particlesJS frame loop for this specific instance and splice it out
  const pJSDom = (window as any).pJSDom
  if (Array.isArray(pJSDom)) {
    const idx = pJSDom.findIndex(item => item && item.el && item.el.id === instanceId)
    if (idx !== -1) {
      const item = pJSDom[idx]
      if (item && item.pJS && item.pJS.fn && typeof item.pJS.fn.drawAnimFrame === 'number') {
        cancelAnimationFrame(item.pJS.fn.drawAnimFrame)
      }
      pJSDom.splice(idx, 1)
    }
  }

  const canvas = document.querySelector(`#${instanceId} canvas`)
  if (canvas) {
    canvas.remove()
  }
})
</script>

<template>
  <div :id="instanceId" class="particles-bg" />
</template>

<style scoped>
.particles-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  opacity: 0.8;
  background-color: transparent;
  overflow: hidden;
  /* Very gentle double radial glows */
  background: 
    radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--gv-primary) 3.5%, transparent) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, color-mix(in srgb, #0ea5e9 1.5%, transparent) 0%, transparent 50%);
}

.dark .particles-bg {
  /* Extremely dark subtle glows */
  background: 
    radial-gradient(circle at 80% 20%, color-mix(in srgb, var(--gv-primary) 1.5%, transparent) 0%, transparent 50%),
    radial-gradient(circle at 20% 80%, color-mix(in srgb, #0ea5e9 0.8%, transparent) 0%, transparent 50%);
}
</style>
