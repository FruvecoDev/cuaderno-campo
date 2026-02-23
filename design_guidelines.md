{
  "app": {
    "name": "AgroGest Pro",
    "type": "dashboard-saas",
    "audience": ["agrónomos", "técnicos agrícolas", "managers de explotaciones"],
    "north_star_actions": [
      "crear/editar contratos y parcelas rápidamente",
      "consultar estado de finca por KPIs + mapa",
      "registrar visitas/tareas/tratamientos/irrigaciones en campo",
      "generar/descargar PDF/Excel y adjuntar documentos"
    ]
  },
  "brand_personality": {
    "attributes": [
      "profesional y operativo (no ‘marketing’)",
      "calma + control (densidad alta de datos con aire)",
      "preciso (estilo SIG/GIS)",
      "confiable (errores y estados muy claros)"
    ],
    "visual_style_fusion": {
      "layout_principle": "Swiss/International Typographic Style for clarity + Bento grid for KPIs",
      "surface_style": "Soft-elevated cards (subtle shadows) + thin borders (GIS tool vibe)",
      "accent_language": "Agriculture greens (#2c5f2d / #97bf0d) used as status + primary CTAs; warm sand neutrals for backgrounds"
    }
  },
  "typography": {
    "google_fonts": {
      "heading": {
        "family": "Space Grotesk",
        "weights": [500, 600, 700]
      },
      "body": {
        "family": "Work Sans",
        "weights": [400, 500, 600]
      },
      "mono": {
        "family": "Azeret Mono",
        "weights": [400, 500]
      },
      "import_instruction": "Add <link> tags in /app/frontend/public/index.html for Space Grotesk, Work Sans, Azeret Mono (Google Fonts). Then set in index.css: body { font-family: var(--font-body); } and headings via utility classes or a base h1,h2 rule."
    },
    "scale": {
      "h1": "text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight",
      "h2": "text-base md:text-lg font-medium text-muted-foreground",
      "section_title": "text-xl md:text-2xl font-semibold tracking-tight",
      "body": "text-sm md:text-base leading-6",
      "small": "text-xs text-muted-foreground",
      "numeric_kpi": "text-2xl md:text-3xl font-semibold tabular-nums"
    }
  },
  "color_system": {
    "notes": [
      "Use greens primarily as ‘state + action’, not as large fills.",
      "Prefer warm neutral surfaces for long reading/table scanning.",
      "No heavy gradients; if used, only as a mild hero/header backdrop and <=20% viewport."
    ],
    "palette": {
      "primary_forest": "#2c5f2d",
      "primary_lime": "#97bf0d",
      "ink": "#101418",
      "slate": "#334155",
      "bg": "#f7f7f2",
      "surface": "#ffffff",
      "surface_2": "#f1f5f0",
      "border": "#dde6dc",
      "map_panel": "#0f1b13",
      "warning": "#d97706",
      "danger": "#b42318",
      "info": "#0e7490"
    },
    "semantic_tokens_hsl_for_shadcn": {
      "instruction": "Replace :root tokens in /app/frontend/src/index.css with these HSL values. Keep .dark optional; app can be light-first with a ‘map dark panel’ as a local surface.",
      "root": {
        "--background": "60 20% 97%",
        "--foreground": "210 20% 8%",
        "--card": "0 0% 100%",
        "--card-foreground": "210 20% 8%",
        "--popover": "0 0% 100%",
        "--popover-foreground": "210 20% 8%",
        "--primary": "122 37% 27%",
        "--primary-foreground": "60 20% 97%",
        "--secondary": "120 18% 95%",
        "--secondary-foreground": "210 20% 12%",
        "--muted": "120 10% 94%",
        "--muted-foreground": "215 12% 40%",
        "--accent": "74 85% 40%",
        "--accent-foreground": "210 20% 8%",
        "--destructive": "6 77% 45%",
        "--destructive-foreground": "0 0% 98%",
        "--border": "120 12% 86%",
        "--input": "120 12% 86%",
        "--ring": "122 37% 27%",
        "--radius": "0.75rem",
        "--chart-1": "122 37% 27%",
        "--chart-2": "74 85% 40%",
        "--chart-3": "191 79% 30%",
        "--chart-4": "27 87% 55%",
        "--chart-5": "215 16% 45%"
      },
      "local_surface_tokens": {
        "map_panel": {
          "bg": "#0f1b13",
          "fg": "#e7f2e7",
          "border": "rgba(231,242,231,0.14)"
        }
      }
    },
    "allowed_gradients": {
      "header_backdrop": {
        "css": "radial-gradient(1200px 600px at 15% 0%, rgba(151,191,13,0.18), transparent 55%), radial-gradient(900px 520px at 85% 10%, rgba(44,95,45,0.12), transparent 60%)",
        "usage": "Only behind top header area of dashboard (<= 18% viewport height)."
      },
      "restriction": "Follow GRADIENT RESTRICTION RULE at end of this doc."
    }
  },
  "layout": {
    "responsive_strategy": {
      "priority": "desktop-first usable on tablet; mobile supports ‘quick capture’ flows",
      "breakpoints": {
        "sidebar": "collapsed icon-only at <1024px; full at >=1024px",
        "tables": "switch to stacked rows/cards at <768px for critical lists"
      }
    },
    "grid": {
      "page_container": "max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8",
      "app_shell": "grid grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr]",
      "content_spacing": "space-y-6 lg:space-y-8",
      "kpi_grid": "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6",
      "dashboard_main_split": "grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 lg:gap-6"
    },
    "navigation": {
      "pattern": "Left sidebar with grouped modules + quick actions footer",
      "sections": [
        "Operación (Dashboard, Visitas, Tareas)",
        "Gestión (Contratos, Documentos)",
        "Territorio (Parcelas, Fincas)",
        "Campo (Tratamientos, Irrigaciones, Recetas)",
        "Logística (Albaranes, Cosechas)"
      ],
      "icon_guidance": "Use lucide-react icons only (Map, FileText, ClipboardList, Droplets, SprayCan, Tractor, Calendar, Upload, BarChart)."
    }
  },
  "components": {
    "component_path": {
      "shell": [
        "/app/frontend/src/components/ui/resizable.jsx (optional for resizable sidebar)",
        "/app/frontend/src/components/ui/scroll-area.jsx (sidebar + tables)",
        "/app/frontend/src/components/ui/separator.jsx"
      ],
      "navigation": [
        "/app/frontend/src/components/ui/tooltip.jsx",
        "/app/frontend/src/components/ui/collapsible.jsx",
        "/app/frontend/src/components/ui/breadcrumb.jsx"
      ],
      "data_display": [
        "/app/frontend/src/components/ui/card.jsx",
        "/app/frontend/src/components/ui/badge.jsx",
        "/app/frontend/src/components/ui/table.jsx",
        "/app/frontend/src/components/ui/skeleton.jsx",
        "/app/frontend/src/components/ui/pagination.jsx",
        "/app/frontend/src/components/ui/hover-card.jsx"
      ],
      "forms": [
        "/app/frontend/src/components/ui/form.jsx",
        "/app/frontend/src/components/ui/input.jsx",
        "/app/frontend/src/components/ui/textarea.jsx",
        "/app/frontend/src/components/ui/select.jsx",
        "/app/frontend/src/components/ui/checkbox.jsx",
        "/app/frontend/src/components/ui/radio-group.jsx",
        "/app/frontend/src/components/ui/switch.jsx",
        "/app/frontend/src/components/ui/calendar.jsx",
        "/app/frontend/src/components/ui/dialog.jsx",
        "/app/frontend/src/components/ui/sheet.jsx",
        "/app/frontend/src/components/ui/accordion.jsx",
        "/app/frontend/src/components/ui/tabs.jsx"
      ],
      "feedback": [
        "/app/frontend/src/components/ui/alert.jsx",
        "/app/frontend/src/components/ui/alert-dialog.jsx",
        "/app/frontend/src/components/ui/sonner.jsx"
      ]
    },
    "button_system": {
      "tone": "Professional / Corporate",
      "tokens": {
        "--btn-radius": "12px",
        "--btn-shadow": "0 1px 0 rgba(16,20,24,0.06), 0 8px 24px rgba(16,20,24,0.08)",
        "--btn-press-scale": "0.98"
      },
      "variants": {
        "primary": {
          "tailwind": "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "usage": "Guardar, Crear, Generar PDF/Excel"
        },
        "secondary": {
          "tailwind": "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
          "usage": "Acciones no destructivas (Duplicar, Exportar)"
        },
        "ghost": {
          "tailwind": "hover:bg-accent/20 text-foreground",
          "usage": "Acciones en tablas (ver detalle)"
        },
        "destructive": {
          "tailwind": "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          "usage": "Eliminar"
        }
      },
      "micro_interactions": {
        "hover": "Only transition colors/shadows: 'transition-colors duration-150' + optional 'shadow-sm hover:shadow-md'",
        "press": "active:scale-[0.98] (avoid transition-all)",
        "loading": "Show spinner left of label + disable button (aria-busy=true)"
      }
    },
    "tables": {
      "pattern": "Toolbar (search + filters + date range) above table; sticky header; row actions at end; bulk select",
      "toolbar_components": ["Input", "Select", "Popover (advanced filters)", "Calendar (range)", "Button"],
      "table_classes": {
        "wrapper": "rounded-xl border border-border bg-card overflow-hidden",
        "header": "bg-secondary/60 sticky top-0 z-10",
        "row": "hover:bg-secondary/50",
        "cell_numeric": "text-right tabular-nums",
        "empty_state": "py-12 text-center text-sm text-muted-foreground"
      },
      "filter_design": {
        "chips": "Use Badge variant=secondary for applied filters; each chip has an X icon button",
        "saved_views": "Use DropdownMenu for 'Vistas' (Mis filtros)"
      },
      "data_testid_examples": {
        "search": "data-testid=\"contracts-table-search-input\"",
        "filter_button": "data-testid=\"contracts-table-filters-button\"",
        "export": "data-testid=\"contracts-table-export-button\"",
        "row_action": "data-testid=\"contracts-table-row-actions-button\""
      }
    },
    "forms": {
      "structure": "Long forms must be multi-step (Tabs or Accordion) + sticky right summary panel on desktop.",
      "contract_form_sections": [
        "Identificación",
        "Titular / Arrendatario",
        "Fechas y vigencias",
        "Condiciones económicas",
        "Parcelas vinculadas",
        "Documentos"
      ],
      "field_density_rules": [
        "Use 2-column grid on >=md: 'grid grid-cols-1 md:grid-cols-2 gap-4'.",
        "Use helper text for constraints; errors inline via shadcn FormMessage.",
        "Use Input masks only if necessary; otherwise keep inputs fast."
      ],
      "sticky_actions": "Bottom action bar for Save/Cancel on mobile; on desktop, place at top-right + duplicate at bottom.",
      "data_testid_examples": {
        "save": "data-testid=\"contract-form-save-button\"",
        "cancel": "data-testid=\"contract-form-cancel-button\"",
        "field": "data-testid=\"contract-form-canon-anual-input\""
      }
    },
    "dashboard": {
      "kpi_cards": {
        "design": "Card with icon, KPI number, delta badge, mini sparkline (Recharts optional)",
        "kpi_card_classes": "rounded-xl border border-border bg-card p-4 lg:p-5 shadow-[0_1px_0_rgba(16,20,24,0.06)]",
        "delta_badge": "Badge: green for up, amber for attention; never rely on color only—include arrow icon"
      },
      "charts": {
        "library": "recharts",
        "usage": [
          "Yield by crop (BarChart)",
          "Tasks completion (AreaChart)",
          "Treatments by week (LineChart)"
        ],
        "empty_state": "Show Skeleton + label 'Cargando métricas…'"
      },
      "activity_timeline": {
        "pattern": "Vertical timeline in Card (use Separator + small dots). Show module icon + short text + timestamp",
        "interaction": "Hover highlights linked entity; click navigates to detail"
      }
    },
    "map_gis": {
      "library": "leaflet + react-leaflet",
      "layout": "Split view: left table/list of parcelas, right map. On desktop allow resizing; on mobile toggle via Tabs (Lista/Mapa).",
      "polygon_editing": "Use leaflet-draw or a React wrapper for drawing/editing polygons. Provide clear ‘Editar polígono’ mode with top map toolbar.",
      "map_toolbar": {
        "pattern": "Floating Card top-left inside map: layers, draw, snap, export geojson",
        "classes": "absolute top-3 left-3 z-[500] rounded-xl border border-border/60 bg-white/90 backdrop-blur px-2 py-2 shadow-md"
      },
      "map_state_colors": {
        "default_polygon": "stroke: #2c5f2d (weight 2), fill: rgba(151,191,13,0.22)",
        "hover": "fill: rgba(151,191,13,0.30)",
        "selected": "stroke: #0e7490, fill: rgba(14,116,144,0.20)",
        "invalid": "stroke: #b42318, dashArray: '6 4'"
      },
      "data_testid_examples": {
        "toggle": "data-testid=\"parcelas-view-toggle-tabs\"",
        "add_polygon": "data-testid=\"parcelas-map-draw-polygon-button\"",
        "layer": "data-testid=\"parcelas-map-layer-dropdown\""
      }
    },
    "documents": {
      "pattern": "Gallery grid + list view toggle. Upload via Dropzone inside Card.",
      "components": ["Card", "Tabs", "Dialog", "Progress", "Sonner"],
      "file_cards": "AspectRatio for previews; overlay actions appear on hover (View, Download, Link to entity)",
      "data_testid_examples": {
        "upload": "data-testid=\"documents-upload-button\"",
        "file": "data-testid=\"documents-file-card\""
      }
    }
  },
  "motion": {
    "principles": [
      "Motion communicates state changes (filter applied, row saved, map selection).",
      "Keep durations short: 150–220ms for UI; 280ms for panels/sheets.",
      "Respect prefers-reduced-motion."
    ],
    "library": {
      "recommended": "framer-motion",
      "install": "npm i framer-motion",
      "usage": "Animate sidebar collapse, table row insert, and sheet/dialog entrances. Avoid animating large tables continuously."
    },
    "micro_interactions": {
      "sidebar_active": "Active item has left indicator bar (2px) that slides in (layout animation).",
      "table_row": "Hover background + action buttons fade in (opacity transition-colors only).",
      "map": "On selecting parcela from list, flyTo polygon bounds + pulse outline once (CSS keyframe or leaflet style change)."
    }
  },
  "accessibility": {
    "requirements": [
      "WCAG AA contrast for text and controls.",
      "Visible focus rings: use --ring and ring-offset.",
      "Tables: ensure header cells <th> and aria-sort where applicable.",
      "Forms: label every input; show error message text (not only red border)."
    ],
    "keyboard": {
      "command_palette": "Optional: use Command component for global search (Ctrl+K) to jump to modules/entities. data-testid=global-command-palette"
    }
  },
  "testing_attributes": {
    "rule": "All interactive + key informational elements MUST include data-testid in kebab-case describing role.",
    "examples": [
      "sidebar-nav-contracts-link",
      "dashboard-kpi-total-parcelas",
      "parcelas-map-container",
      "tareas-create-button",
      "table-pagination-next-button",
      "form-stepper-next-button",
      "pdf-export-button"
    ]
  },
  "image_urls": {
    "dashboard_header_backdrop": [
      {
        "url": "https://images.pexels.com/photos/1916839/pexels-photo-1916839.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Aerial cropland geometric pattern; use as very subtle blurred header backdrop (opacity 6–10%)",
        "category": "dashboard"
      }
    ],
    "empty_states_documents": [
      {
        "url": "https://images.pexels.com/photos/6508543/pexels-photo-6508543.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Human agricultural context for empty state illustration (use small thumbnail in Card)",
        "category": "documents"
      }
    ],
    "map_context": [
      {
        "url": "https://images.pexels.com/photos/11538216/pexels-photo-11538216.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        "description": "Landscape aerial imagery for map page header/empty states (not as map tiles)",
        "category": "parcelas"
      }
    ]
  },
  "instructions_to_main_agent": {
    "css_cleanup": [
      "Remove centered .App-header patterns from /app/frontend/src/App.css usage; do not apply text-align:center to app containers.",
      "Update /app/frontend/src/index.css tokens to agriculture palette HSL above.",
      "Set base fonts via CSS variables: --font-heading, --font-body, --font-mono; apply in body and headings.",
      "Add a subtle noise overlay utility (CSS background-image) for large section backgrounds only (<= 20% gradient rule still applies)."
    ],
    "app_shell_build": [
      "Create an AppShell layout with left sidebar + top header (search, quick create, user).",
      "Use ScrollArea in sidebar; keep module groups with Collapsible.",
      "Ensure every nav item has data-testid and aria-current for active route."
    ],
    "module_page_patterns": [
      "List pages: toolbar + table + right-side details Sheet on row click.",
      "Detail pages: header with breadcrumbs, status badges, actions; content in 2-column grid with sticky summary card.",
      "Create/Edit: multi-step tabs/accordion + validation; persistent Save/Cancel actions."
    ],
    "maps": [
      "Parcelas page must support split list/map view, polygon select sync (list hover highlights polygon).",
      "Add floating map toolbar using Card.",
      "When polygon invalid/self-intersecting, show Alert + red dashed style."
    ],
    "exports": [
      "Add export button group (PDF/Excel) in list pages; show Sonner toast on success/failure.",
      "For long operations show Progress indicator in a Dialog or inline."
    ],
    "component_conventions_js": [
      "This repo uses .js/.jsx shadcn components. Keep new components in .jsx with named exports; pages default export.",
      "No raw HTML dropdown/calendar—use shadcn ui components from /components/ui."
    ]
  },
  "general_ui_ux_design_guidelines_appendix": "<General UI UX Design Guidelines>\n    - You must **not** apply universal transition. Eg: `transition: all`. This results in breaking transforms. Always add transitions for specific interactive elements like button, input excluding transforms\n    - You must **not** center align the app container, ie do not add `.App { text-align: center; }` in the css file. This disrupts the human natural reading flow of text\n   - NEVER: use AI assistant Emoji characters like`🤖🧠💭💡🔮🎯📚🎭🎬🎪🎉🎊🎁🎀🎂🍰🎈🎨🎰💰💵💳🏦💎🪙💸🤑📊📈📉💹🔢🏆🥇 etc for icons. Always use **FontAwesome cdn** or **lucid-react** library already installed in the package.json\n\n **GRADIENT RESTRICTION RULE**\nNEVER use dark/saturated gradient combos (e.g., purple/pink) on any UI element.  Prohibited gradients: blue-500 to purple 600, purple 500 to pink-500, green-500 to blue-500, red to pink etc\nNEVER use dark gradients for logo, testimonial, footer etc\nNEVER let gradients cover more than 20% of the viewport.\nNEVER apply gradients to text-heavy content or reading areas.\nNEVER use gradients on small UI elements (<100px width).\nNEVER stack multiple gradient layers in the same viewport.\n\n**ENFORCEMENT RULE:**\n    • Id gradient area exceeds 20% of viewport OR affects readability, **THEN** use solid colors\n\n**How and where to use:**\n   • Section backgrounds (not content backgrounds)\n   • Hero section header content. Eg: dark to light to dark color\n   • Decorative overlays and accent elements only\n   • Hero section with 2-3 mild color\n   • Gradients creation can be done for any angle say horizontal, vertical or diagonal\n\n- For AI chat, voice application, **do not use purple color. Use color like light green, ocean blue, peach orange etc**\n\n</Font Guidelines>\n\n- Every interaction needs micro-animations - hover states, transitions, parallax effects, and entrance animations. Static = dead. \n   \n- Use 2-3x more spacing than feels comfortable. Cramped designs look cheap.\n\n- Subtle grain textures, noise overlays, custom cursors, selection states, and loading animations: separates good from extraordinary.\n   \n- Before generating UI, infer the visual style from the problem statement (palette, contrast, mood, motion) and immediately instantiate it by setting global design tokens (primary, secondary/accent, background, foreground, ring, state colors), rather than relying on any library defaults. Don't make the background dark as a default step, always understand problem first and define colors accordingly\n    Eg: - if it implies playful/energetic, choose a colorful scheme\n           - if it implies monochrome/minimal, choose a black–white/neutral scheme\n\n**Component Reuse:**\n\t- Prioritize using pre-existing components from src/components/ui when applicable\n\t- Create new components that match the style and conventions of existing components when needed\n\t- Examine existing components to understand the project's component patterns before creating new ones\n\n**IMPORTANT**: Do not use HTML based component like dropdown, calendar, toast etc. You **MUST** always use `/app/frontend/src/components/ui/ ` only as a primary components as these are modern and stylish component\n\n**Best Practices:**\n\t- Use Shadcn/UI as the primary component library for consistency and accessibility\n\t- Import path: ./components/[component-name]\n\n**Export Conventions:**\n\t- Components MUST use named exports (export const ComponentName = ...)\n\t- Pages MUST use default exports (export default function PageName() {...})\n\n**Toasts:**\n  - Use `sonner` for toasts\"\n  - Sonner component are located in `/app/src/components/ui/sonner.tsx`\n\nUse 2–4 color gradients, subtle textures/noise overlays, or CSS-based noise to avoid flat visuals.\n</General UI UX Design Guidelines>"
}
