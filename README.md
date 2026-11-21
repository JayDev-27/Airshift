<div align="center">

<img src="public/airshift-icon.png" alt="Airshift logo with three airflow strokes" width="80" height="80">

<h1>Airshift</h1>

<p><strong>Turn an air-quality forecast into a plan your household can use.</strong></p>

<p>
  <a href="https://airshift-smog.jtnpanjio.chatgpt.site"><img src="https://img.shields.io/badge/Live%20app-Airshift-3f5632?style=flat-square" alt="Airshift live app"></a>
  <a href="https://github.com/JayDev-27/Airshift"><img src="https://img.shields.io/badge/Coverage-14%20Indian%20cities-687b50?style=flat-square" alt="14 Indian cities"></a>
  <a href="https://ai.google.dev/gemini-api/docs/structured-output"><img src="https://img.shields.io/badge/Gemini-Structured%20output-526b48?style=flat-square" alt="Gemini structured output integration"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Code%20license-MIT-3f5632?style=flat-square" alt="MIT code license"></a>
</p>

<p><a href="https://airshift-smog.jtnpanjio.chatgpt.site"><strong>Open Airshift</strong></a> · <a href="#quick-start">Quick start</a> · <a href="#see-it-in-action">Demo</a> · <a href="docs/methodology.md">Methodology</a></p>

<a href="https://airshift-smog.jtnpanjio.chatgpt.site"><img src="assets/overview.webp" alt="Airshift overview showing an interactive Old Delhi model, a severe PM₂.₅ sample, hourly readings, and projected household impact" width="100%"></a>

</div>

Built for **Prompt Wars Challenge 06**, Airshift helps families, outdoor workers, and community organizers decide what to do during urban air pollution. It turns regional PM₂.₅ and the constraints of an actual day into a plan for outdoor activity, indoor air, and travel. [Prompt Wars Virtual](https://promptwars.in/promptwarsVirtual.html)

## See it in action

<table>
<tr>
<td width="50%" valign="top">
<img src="assets/city-switch.gif" alt="The city picker changes the Delhi map to Mumbai’s city photo and updates the forecast view" width="100%">
<br><strong>Switch location and inspect the forecast</strong><br>
<sub>Compare 14 cities and switch between an hourly chart and exact readings.</sub>
</td>
<td width="50%" valign="top">
<img src="assets/assistant-follow-up.gif" alt="The Airshift assistant opens and reveals a source-backed answer progressively" width="100%">
<br><strong>Ask about a real decision</strong><br>
<sub>Get a source-backed reply and add its actions to the daily plan.</sub>
</td>
</tr>
</table>

### A plan you can explain

| Decision | What Airshift shows |
| --- | --- |
| **Move outdoor play indoors** | In the synthetic Delhi scenario, moving the sample 30-minute session indoors avoids 30 outdoor minutes. |
| **Replace one petrol-car trip** | Skipping the sample 12 km drive at 14 km/L avoids about 2.0 kg of the car’s tailpipe CO₂. The model shows the fuel factor and what the estimate includes. |
| **Improve air at home** | A room-by-room checklist, no-purchase options, and a purifier sizing estimate based on floor area. |
| **Coordinate a group** | A briefing to copy for a school or residents’ group with current data status and a link to official readings. |

<details>
<summary><strong>More screenshots</strong></summary>

<table>
<tr>
<td width="50%" valign="top"><img src="assets/mumbai.webp" alt="Mumbai overview with the Bandra–Worli Sea Link, PM₂.₅ chart, and a revised daily plan" width="100%"><br><strong>Mumbai overview</strong></td>
<td width="50%" valign="top"><img src="assets/assistant.webp" alt="Airshift assistant responding about indoor air with practical steps and a source link" width="100%"><br><strong>Source-backed assistant</strong></td>
</tr>
</table>

<img src="assets/mobile.webp" alt="Mobile Airshift overview with the 3D city scene and bottom navigation" width="300">

</details>

## Quick start

Use Node.js 22.12 or newer.

```sh
git clone https://github.com/JayDev-27/Airshift.git
cd Airshift
npm ci
npm run dev
```

Open [localhost:5173](http://localhost:5173). The demo, regional forecasts, plan, and guided assistant work without an API key.

| Command | Purpose |
| --- | --- |
| `npm test` | Run 51 planner, forecast, assistant, API, security and hosted-runtime tests |
| `npm run test:coverage` | Run the tests with a coverage report |
| `npm run lint` | ESLint with React Hooks and strict `jsx-a11y` accessibility rules |
| `npm run check` | Lint, test and build, as CI does |
| `npm run build` | Build the browser application |
| `npm start` | Serve the production build at [localhost:8080](http://localhost:8080) |
| `npm run build:site` | Package the browser app and API as a deployable Worker |

Copy `.env.example` to `.env` and set `GEMINI_API_KEY` to enable the Gemini assistant on the server. The default model is Gemini 3.5 Flash-Lite. The hosted demo currently uses guided mode. [Google AI Studio keys](https://aistudio.google.com/apikey)

## How it works

```mermaid
flowchart LR
    A["City and household settings"] --> B["Plan engine"]
    C["CAMS PM₂.₅ forecast or winter demo"] --> B
    D["Follow-up question"] --> E["Gemini or guided mode"]
    E -->|"Selected reviewed actions"| B
    B --> F["Daily plan, source links, impact estimates"]
```

- **Observation and prediction.** The current forecast uses Open-Meteo and CAMS at regional resolution. CPCB station readings are linked for local decisions. The synthetic winter scenario is labeled throughout. [Open-Meteo](https://open-meteo.com/en/docs/air-quality-api) · [CPCB](https://airquality.cpcb.gov.in/AQI_India/)
- **Grounded assistant.** Gemini returns structured action IDs and practical constraints. Airshift validates them and calculates impact from explicit inputs. [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)
- **Evidence and limitations.** [Methodology and credits](docs/methodology.md) · [Audit](AUDIT.md) · [Build narrative](BUILD-NARRATIVE.md)

## Quality

| Area | How it is handled |
| --- | --- |
| **Code quality** | The pure planning engine in [`src/domain.mjs`](src/domain.mjs) is shared by the UI, the Node server and the Worker. The server modules are small and single-purpose, exported functions carry JSDoc, and ESLint runs in [CI](.github/workflows/ci.yml). |
| **Security** | Server-side key, allowlisted model output, body and length limits, rate limits, and a shared hardening header set. See [SECURITY.md](SECURITY.md). |
| **Efficiency** | The 3D scene is lazy-loaded behind a still preview. Hashed bundles are cached for a year, text is compressed, and forecasts are cached per city for five minutes with one shared in-flight request. |
| **Testing** | `node:test` covers every city and household type, CPCB band edges, window selection, guided routing including Hindi keywords, forecast validation, Gemini fallbacks and allowlisting, rate limiting, and headers on both runtimes. Line coverage is 100% for the domain and server modules. |
| **Accessibility** | Skip link, native `<dialog>` focus handling, keyboard-operable selectors with roving focus, a readings table alternative to the chart, `prefers-reduced-motion` support, live status regions, and strict `jsx-a11y` linting. |

## License

Airshift’s code is [MIT licensed](LICENSE). The Old Delhi map data is from OpenStreetMap contributors under ODbL, and city photography retains its individual Creative Commons licenses. [OpenStreetMap attribution](https://www.openstreetmap.org/copyright) · [Photo credits](docs/methodology.md#city-photography)
