# 🇫🇷 Mots A2: DELF French Flashcards

Everything you need for the **DELF A2** French exam: the most common vocabulary by topic, the key exam expressions, and 110 conjugated verbs, with **real native-speaker recordings**.

**▶ Open it:** https://liam6251.github.io/french-a2-flashcards/

## What's inside
- **1,350 flashcards in 48 decks**
  - **24 vocabulary decks** on DELF topics: identity, family, describing people, home, daily routine, food, restaurant, shopping, clothes, town & directions, transport, travel, weather, dates & time, numbers, free time, health, work, school, phone & internet, celebrations, feelings, nature, plus the original **Top 100**
  - **24 expression decks** for the speaking and writing tasks: greetings, politeness, introducing yourself, asking for information, inviting, accepting and refusing, likes, opinions, feelings, apologising, the phone, writing emails, shops, restaurants, directions, hotels, the doctor, telling a story in the past, future plans, advice and complaints, linking words, everyday expressions, and the **DELF exam instructions**
- **Native audio**: word recordings by Lingua Libre volunteers, plus a short native-speaker sentence on hundreds of cards (Tatoeba). Everything else falls back to the device's French voice.
- **Spaced repetition**: the daily session shows the cards that are due first, then new ones. Cards you know come back after 1, 3, 7, 14, 30 and 60 days.
- **Conjugation**: 110 verbs in the présent, imparfait, passé composé and futur simple, with endings highlighted, tap-to-hear, and a practice quiz
- **DELF guide**: the four parts of the exam, timings, tips, and model answers to listen to
- Search across every card, starred cards, type-the-answer mode, FR→EN or EN→FR, swipe on a phone, keyboard shortcuts, slow audio, dark and light themes, progress backup and restore

## Audio credits
- Word recordings: [Lingua Libre](https://lingualibre.org) volunteers via Wikimedia Commons (CC BY-SA). Speaker and source per word: [`audio/words.json`](audio/words.json)
- Sentence recordings: [Tatoeba](https://tatoeba.org) contributors (CC BY, CC BY-SA or CC BY-NC as marked). Speaker, licence and link per sentence: [`audio/sentences.json`](audio/sentences.json), also shown on each card

## Rebuilding the audio
```bash
node tools/fetch-words.cjs                       # Lingua Libre word recordings
node tools/pick-sentences.cjs <tatoeba-exports>  # native sentences from the Tatoeba data exports
node tools/build-index.cjs                       # writes audio/index.json for the app
```
