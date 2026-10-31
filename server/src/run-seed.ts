import { seedDb } from "./seed"

seedDb().then(() => { console.log("Seed xong."); process.exit(0) }).catch((e) => { console.error(e); process.exit(1) })
