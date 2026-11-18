# Airshift helps families plan a day around winter smog

On a winter smog morning, an air-quality reading tells you there is a problem. A parent still has to decide about playtime and pickup. An outdoor worker may have a fixed shift. A school or residents’ group needs a message people can act on.

I built Airshift for the Prompt Wars Urban Air Quality Assistant challenge to turn those decisions into a plan. It uses a regional PM₂.₅ forecast, a household profile and source-backed actions. Families can move an activity indoors, set up a cleaner room using what they already have, and consider replacing a petrol trip when transit is feasible. Community organizers can copy a briefing with the date or demo label and official links.

The biggest design decision was to give Gemini the part that benefits from language understanding. It reads a question such as “I can’t reschedule outdoor work and have no purifier” and returns action IDs and constraints. The app uses those selections to assemble the actual advice and calculate the impact. That keeps the same methodology behind the dashboard and the assistant.

In the synthetic Delhi demo, moving a half-hour play session inside would avoid 30 minutes outdoors. Replacing a 12 km round trip in a petrol car that gets 14 km/L would avoid about 2.0 kg of petrol-car tailpipe CO₂. Each number includes the assumption that produced it. The current forecast uses a regional atmospheric grid, and nearby CPCB readings are linked for local decisions.

The same workflow handles a fixed outdoor shift, homes without a purifier, and locations with no practical metro access. People can explore the demo and use guided recommendations even when Gemini is unavailable.

[Prompt Wars Virtual](https://promptwars.in/promptwarsVirtual.html)
