# Airshift

Airshift helps Indian households, outdoor workers and community organizers make a daily plan during urban air pollution. It uses a winter demo that opens immediately, a current regional forecast for 14 Indian cities, and a Gemini assistant that adapts source-backed actions to a question.

## Run it

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The winter demo, current forecast, impact calculations, purifier sizing and guided assistant work without an API key.

To enable Gemini, copy `.env.example` to `.env`, set `GEMINI_API_KEY` using a key from [Google AI Studio](https://aistudio.google.com/apikey), and restart the server. The default model is Gemini 3.5 Flash-Lite. The response shows **Gemini** when it uses the model and **Guided mode** when it uses the local fallback. The key stays server-side. Household settings and action selections are saved in the browser. Sending a question with Gemini enabled sends the typed text, up to two preceding questions, selected profile settings and PM₂.₅ summary to Gemini. The server does not save conversations.

## Demo for evaluation

1. Open the New Delhi winter demo. It starts at **292 µg/m³** on the synthetic 24-hour average. The default family plan projects **30 outdoor minutes avoided** and **about 2.0 kg of petrol-car tailpipe CO₂ avoided** if the activities change.
2. Uncheck the outdoor action and watch the impact recalculate. Use **Customize plan** to switch to an outdoor worker with a fixed shift and no feasible public transport. The plan changes to shorter outdoor blocks and combined errands.
3. Ask **“I can’t reschedule outdoor work and have no purifier. What can I actually do?”** With Gemini configured, look for the response’s model label and interpreted constraints. Try **“Help our neighbourhood plan”** to get a shareable briefing.
4. Switch to **Current forecast** or change city. Confirm the forecast and the demo are visibly distinguished. In **Indoor air**, enter 20 m² to see an estimated smoke CADR of 244 m³/h. In **Community**, copy a briefing with the air-data status and official links.

## Research and implementation

| Decision | Finding and source |
| --- | --- |
| Show PM₂.₅ with units and time basis | India’s official AQI combines pollutant sub-indices using monitoring and data completeness rules. Airshift shows a modeled 24-hour PM₂.₅ value and applies India’s PM₂.₅ concentration bands. Official station readings are a separate link. WHO provides health-based guideline values at defined averaging periods. [CPCB methodology](https://app.cpcbccr.com/ccr_docs/FINAL-REPORT_AQI_.pdf) · [WHO guidelines](https://www.who.int/publications/i/item/9789240034228) |
| Treat forecast timing as a city-scale planning signal | CAMS Global is approximately 45 km in India. Open-Meteo distributes the forecast at hourly intervals from coarser inputs. A lower slot can still have high pollution. Local station readings and school or government advisories remain the sources for immediate decisions. [Open-Meteo forecast documentation](https://open-meteo.com/en/docs/air-quality-api) · [CPCB stations](https://airquality.cpcb.gov.in/AQI_India/) · [CAQM orders](https://caqm.nic.in/) |
| Rank equivalent outdoor blocks and keep the fixed-shift option | Airshift compares modeled average PM₂.₅ for the same activity duration. Marking an activity as moved indoors counts outdoor minutes avoided. The estimate excludes breathing rate, near-road variation and indoor concentration. The shift guidance reflects practical exposure reduction. [AirNow school guide](https://www.airnow.gov/publications/activity-guides/air-quality-and-outdoor-activity-guidance-for-schools/) · [EPA outdoor exposure guidance](https://www.epa.gov/wildfire-smoke-course/strategies-reduce-exposure-outdoors) |
| Prioritize no-purchase indoor steps | Source control, cleaner rooms, kitchen exhaust and correctly sized filtration address different indoor particle sources. For the calculator, EPA’s two-thirds cfm per ft² rule converts to approximately 12.2 m³/h per m². [EPA cleaner-air room](https://www.epa.gov/wildfires/how-create-cleaner-air-room-home) · [EPA purifier sizing and ozone guidance](https://www.epa.gov/indoor-air-quality-iaq/guide-air-cleaners-home) |
| Use a transparent transport baseline | Petrol-car tailpipe CO₂ avoided = avoided kilometres ÷ fuel economy × approximately 2.35 kg CO₂ per litre. That is the gross avoided tailpipe amount. It excludes emissions from the replacement trip and changes in ambient pollution. [EPA fuel CO₂ factors](https://www.epa.gov/greenvehicles/greenhouse-gas-emissions-typical-passenger-vehicle) · [Delhi Metro CarbonLite](https://delhimetrorail.com/carbonlite-metro-travel) |
| Give the model a constrained role | Gemini ranks reviewed actions, extracts practical constraints and selects a checklist, schedule or group format using a JSON schema. The application checks returned IDs and computes the recommendation details and impact values from the selected data. [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output) |

The default city and profile are synthetic and selected to demonstrate a severe winter episode. Current forecasts use city coordinates, so they cannot resolve individual streets or building conditions. The planner’s concentration thresholds guide conservative defaults and are implementation choices.

## Production and Prompt Wars

Run `npm test` for the planner and API tests. Run `npm run build && npm start` for the production server on port 8080. The included Dockerfile can be built locally or used for Cloud Run source deployment. From an authenticated project with Cloud Run enabled, deploy with:

```sh
gcloud run deploy airshift --source . --region asia-south1 --allow-unauthenticated
```

To turn on Gemini in a Cloud Run deployment, create a Secret Manager secret named `gemini-api-key`, grant the service identity access, and add `--set-secrets GEMINI_API_KEY=gemini-api-key:latest` at deployment. [Cloud Run source deployments](https://docs.cloud.google.com/run/docs/deploying-source-code) · [Cloud Run secrets](https://docs.cloud.google.com/run/docs/configuring/services/secrets)

The public Challenge 06 brief is **Urban Air Quality Assistant**. The official site asks for code, a live preview and a build narrative. Its FAQ specifies use of Google Antigravity. It keeps selection criteria confidential. Confirm the active challenge’s upload fields and tool requirement in the Hack2skill dashboard. This workspace contains the implementation and a [narrative draft](../BUILD-NARRATIVE.md). The local preview is for testing. A hosted URL and organizer score require deployment and submission. [Prompt Wars Virtual](https://promptwars.in/promptwarsVirtual.html)

## Credits

The Delhi illustration was generated with the built-in ImageGen tool for this app and is stored at `public/delhi-smog.jpg`. The prompt requested a photoreal Delhi winter-smog skyline at dawn, Jama Masjid silhouetted on the right, a dark plum colour grade and negative space for the readings.

An earlier Delhi design used `public/city-relief.webp`, an original ImageGen illustration. The prompt described an elevated Old Delhi-inspired architectural scene with an ivory and celadon palette, sandstone domes, amber winter light and open space for location labels.

The overview uses a Three.js model of Old Delhi. The included geometry extract is derived from [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) under ODbL. The model uses illustrative infill and estimated heights. The air tint depicts the Delhi severity category. Desktop and mobile previews of the same map cover loading and devices without WebGL. Delhi also has a separate photo view.

### City photography

Photographs from Wikimedia Commons are resized and converted to WebP. City chooser thumbnails are cropped. The original Creative Commons licences cover these local copies.

- Rashtrapati Bhavan by Ronakshah1990. [Original](https://commons.wikimedia.org/wiki/File:Forecourt,_Rashtrapati_Bhavan_-_1.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- DLF Cyber City by Tarun4u. [Original](https://commons.wikimedia.org/wiki/File:Cyber_City_View.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- HCL Tech campus by Mohit Agarwal. [Original](https://commons.wikimedia.org/wiki/File:HCL_Tech_Noida_SEZ_Campus.png) · [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
- Indirapuram by Mnstwr2418. [Original](https://commons.wikimedia.org/wiki/File:Indirapuram.jpg) · [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
- Hazratganj Market by Mohit. [Original](https://commons.wikimedia.org/wiki/File:Harzratganj_Market,_Lucknow.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Patna High Court by Patel95. [Original](https://commons.wikimedia.org/wiki/File:Patna_high_court1.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Open Hand Monument by Raakesh Blokhra. [Original](https://commons.wikimedia.org/wiki/File:Open_Hand_monument,_Chandigarh.jpg) · [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/)
- Hawa Mahal by Chainwit.. [Original](https://commons.wikimedia.org/wiki/File:East_facade_Hawa_Mahal_Jaipur_from_ground_level_(July_2022)_-_img_01.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Bandra–Worli Sea Link by Rutiknatekar. [Original](https://commons.wikimedia.org/wiki/File:Mumbai_Bandra-Worli_Sea_Link.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Pune West skyline by Ujjawal.Gayakwad. [Original](https://commons.wikimedia.org/wiki/File:Pune_West_skyline_-_March_2017.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Kolkata Maidan by NalGup20. [Original](https://commons.wikimedia.org/wiki/File:Kolkata_maidan.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- UB City by Prateek Karandikar. [Original](https://commons.wikimedia.org/wiki/File:UB_City,_Bangalore.JPG) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Durgam Cheruvu and HITEC City by iMahesh. [Original](https://commons.wikimedia.org/wiki/File:Aerial_view_of_Durgam_cheruvu_and_Hitech_CIty.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Chennai Central by jamal haider. [Original](https://commons.wikimedia.org/wiki/File:Chennai_Central.jpg) · [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/)
