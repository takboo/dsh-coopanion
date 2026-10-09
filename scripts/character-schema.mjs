import { writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { characterSchema } from '../dist/character-pack.js';
const schema = z.toJSONSchema(characterSchema, { io: 'input' });
schema.$id = 'https://raw.githubusercontent.com/takboo/dsh-coopanion/main/docs/character.schema.json';
schema.title = 'DSH Character Pack v1';
await writeFile('docs/character.schema.json', JSON.stringify(schema, null, 2) + '\n');
