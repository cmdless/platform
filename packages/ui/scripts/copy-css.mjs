import { cp } from "node:fs/promises";

await cp(new URL("../src/styles.css", import.meta.url), new URL("../dist/styles.css", import.meta.url));
