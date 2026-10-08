/* ============================================================
   LANGUAGE — English / Español (Mexican Spanish, "tú").
   The page is written in English. This layer swaps on-screen text for
   Spanish: exact phrases in ES, phrases with numbers in ES_RULES. It never
   touches what the writer typed (inputs, the editor, the reading view, Muse
   answers). Originals are kept, so switching back to English works.
   ============================================================ */
const ES = {
  // first run, splash, header, nav
  "Meet Muse ✦":"Conoce a Muse ✦",
  "Muse is your writing helper. When you're stuck, it suggests ideas. It never writes your book for you.":"Muse te ayuda a escribir. Cuando te atoras, te sugiere ideas. Nunca escribe tu libro por ti.",
  "Muse lives inside your phone, so it works without internet. It needs a":"Muse vive dentro de tu celular, así que funciona sin internet. Necesita una",
  "one-time 2.6 GB download":"descarga única de 2.6 GB",
  ". Please use wifi.":". Usa wifi, por favor.",
  "You can keep writing while it downloads. Until it's done, Muse-lite helps with guiding questions.":"Puedes seguir escribiendo mientras se descarga. Mientras tanto, Muse-lite te ayuda con preguntas guía.",
  "Download now":"Descargar ahora", "Later":"Después",
  "tap to begin":"toca para empezar",
  "Contract":"Contrato","Premise":"Premisa","Story Bible":"Biblia de la historia","Outline":"Esquema","Scenes":"Escenas","Draft":"Borrador","Dashboard":"Tablero","Settings":"Ajustes",
  "1 · Contract":"1 · Contrato","2 · Premise":"2 · Premisa","3 · Story Bible":"3 · Biblia","4 · Outline":"4 · Esquema","5 · Scenes":"5 · Escenas","6 · Draft":"6 · Borrador",
  // contract
  "Stage 1 — The Book Contract":"Etapa 1 — El contrato del libro",
  "Define the promise you're making to yourself. Everything else in MuseBook checks against this.":"Define la promesa que te haces a ti. Todo lo demás en MuseBook se compara con esto.",
  "Working title":"Título provisional","Genre":"Género","Audience":"Público","Point of view":"Punto de vista","Tense":"Tiempo verbal",
  "— choose —":"— elige —","First person":"Primera persona","Third limited":"Tercera limitada","Third omniscient":"Tercera omnisciente","Second person":"Segunda persona","Multiple POV":"Varios puntos de vista",
  "Past":"Pasado","Present":"Presente","Targets":"Metas","Target word count":"Meta de palabras","Planned chapters":"Capítulos planeados","Deadline":"Fecha límite","Daily word goal":"Meta diaria de palabras","Writing style":"Estilo de escritura",
  "Plotter (outline everything first)":"Planificador (primero planeas todo)","Pantser (discover as I write)":"Brújula (descubres al escribir)","Plantser (a little of both)":"Mixto (un poco de ambos)",
  "Your computed plan":"Tu plan calculado","Per chapter":"Por capítulo","words":"palabras","word":"palabra","Days left":"Días restantes","until deadline":"para la fecha límite","set a deadline":"pon una fecha límite","Needed / day":"Necesarias / día","to hit target":"para llegar a la meta",
  // premise
  "Stage 2 — Premise & Promise":"Etapa 2 — Premisa y promesa",
  "Your premise is the heart of your book in a few words: who it's about, what they want, and what stands in their way. If you can't say it in one sentence, the book doesn't know what it is yet.":"La premisa es el corazón de tu libro en pocas palabras: de quién trata, qué quiere y qué se lo impide. Si no la puedes decir en una oración, tu libro todavía no tiene forma.",
  "Your logline is your whole book in one sentence, the one you'd say if someone asked \"what's it about?\" It names the hero, what they want, and what stands in the way.":"El logline es tu libro entero en una sola oración: lo que contestarías si alguien te pregunta «¿de qué trata?». Dice quién es el protagonista, qué quiere y qué se lo impide.",
  "A beat is a moment where something important happens and the story turns. Put them in order and you have the skeleton of your book, before you write a single scene.":"Un momento clave es algo importante que pasa y le da un giro a la historia. Ponlos en orden y tienes el esqueleto de tu libro antes de escribir una sola escena.",
  "Point of view is whose eyes we see the story through. First person is \"I\"; third person is \"she\" or \"he\". Choose it before you write, because changing it later means rewriting.":"El punto de vista es a través de qué ojos vemos la historia. Primera persona es «yo»; tercera persona es «ella» o «él». Elígelo antes de escribir, porque cambiarlo después significa reescribir.",
  "Your theme is the deeper idea under the plot: what your story says about life. A story about a robbery can really be about trust.":"El tema es la idea profunda debajo de la trama: lo que tu historia dice sobre la vida. Una historia de un robo puede tratar, en el fondo, de la confianza.",
  "Your promise is what your book promises the reader. This checks that it's clear: each ○ turns into ✓ when you complete it.":"La promesa es lo que tu libro le promete al lector. Aquí revisas que esté clara: cada ○ se vuelve ✓ cuando lo completas.",
  "Logline — one sentence":"Logline — una oración","Back-cover summary — one paragraph":"Contraportada — un párrafo","Theme — what is this really about?":"Tema — ¿de qué trata en el fondo?",
  "✦ Ask Muse to tighten this":"✦ Pídele a Muse que lo pula","Promise check":"Revisión de la promesa",
  "Logline written":"Logline escrito","Logline is one sentence":"El logline es una sola oración","Summary written":"Resumen escrito","Theme identified":"Tema identificado",
  // bible
  "Stage 3 — Story Bible":"Etapa 3 — Biblia de la historia",
  "Your continuity source of truth. Fill in only what you need — you can always add more later.":"Tu fuente de verdad para la continuidad. Llena solo lo que necesites; siempre puedes agregar más después.",
  "Characters":"Personajes","Locations":"Lugares","World rules / facts":"Reglas del mundo / datos","Nothing here yet.":"Todavía no hay nada aquí.",
  "delete":"borrar","Name":"Nombre","Role":"Papel","Wants":"Quiere","Needs":"Necesita","Flaw":"Defecto","Arc":"Arco","Description":"Descripción","Rule":"Regla","Details":"Detalles",
  "+ Add character":"+ Agregar personaje","+ Add location":"+ Agregar lugar","+ Add rule":"+ Agregar regla",
  // outline
  "Stage 4 — Outline & Beats":"Etapa 4 — Esquema y momentos clave",
  "Pick a structure template, or build your own. Skipping this is allowed — but it's the #1 cause of a stuck draft.":"Elige una estructura o arma la tuya. Puedes saltarte esto, pero es la causa #1 de un borrador atorado.",
  "Load a structure":"Carga una estructura","3-Act":"3 actos","Save the Cat":"Salva al gato","Hero's Journey":"El viaje del héroe","Romance Beats":"Romance","Memoir":"Memorias","Clear all beats":"Borrar todos los momentos",
  "Your beats":"Tus momentos clave","No beats yet. Load a template above, or add your own.":"Todavía no hay momentos. Carga una estructura arriba o agrega los tuyos.",
  "Title":"Título","Act":"Acto","What happens":"Qué pasa","+ Add beat":"+ Agregar momento","✦ Suggest the next beat":"✦ Sugiere el siguiente momento",
  // scenes
  "Stage 5 — Scene Cards":"Etapa 5 — Tarjetas de escena",
  "Every scene needs a POV, a goal, a conflict, and an outcome. If it has none, it's not a scene — it's a note.":"Cada escena necesita un punto de vista, una meta, un conflicto y un resultado. Si no tiene ninguno, no es una escena: es una nota.",
  "No scenes yet. Add one — or load an outline first and build scenes from your beats.":"Todavía no hay escenas. Agrega una, o primero carga un esquema y arma escenas con tus momentos clave.",
  "Chapter":"Capítulo","Scene title":"Título de la escena","POV":"Punto de vista","Goal (what they want)":"Meta (lo que quiere)","Conflict (what blocks them)":"Conflicto (lo que se lo impide)","Outcome (what changes)":"Resultado (lo que cambia)",
  "✦ I'm stuck on this scene":"✦ Estoy atorado en esta escena","+ Add scene":"+ Agregar escena",
  // draft
  "Stage 6 — Draft":"Etapa 6 — Borrador","Write forward. Do not edit. Fix it in revision.":"Escribe hacia adelante. No corrijas. Arréglalo en la revisión.",
  "You need at least one scene before you can draft. Go to":"Necesitas al menos una escena para escribir el borrador. Ve a","and add one.":"y agrega una.","5 · Scenes":"5 · Escenas","+ Quick add a scene":"+ Agregar una escena rápida",
  "Writing now":"Escribiendo ahora","POV:":"Punto de vista:","Goal:":"Meta:","Conflict:":"Conflicto:","Outcome:":"Resultado:","Write":"Escribir","Read chapter":"Leer capítulo",
  "Scene:":"Escena:","Today:":"Hoy:","Size ▾":"Tamaño ▾","Color ▾":"Color ▾",
  "Bold":"Negritas","Italic":"Cursiva","Underline":"Subrayado","Font":"Letra","Size":"Tamaño","Color":"Color","More":"Más","Undo":"Deshacer","Redo":"Rehacer",
  "Write here. Don't edit. Just go.":"Escribe aquí. No corrijas. Solo avanza.",
  "Small":"Chica","Normal":"Normal","Large":"Grande","Huge":"Enorme","Heading":"Título","Subheading":"Subtítulo","Quote":"Cita","Body":"Texto","⟸ Left":"⟸ Izquierda","Center":"Centro","Right ⟹":"Derecha ⟹","S̶trike":"T̶achar","Clear style":"Quitar formato",
  "✦ Suggest how this could continue":"✦ Sugiere cómo podría seguir","Nothing written in this chapter yet.":"Todavía no hay nada escrito en este capítulo.",
  // dashboard
  "Where you actually are, versus where you said you'd be.":"Dónde vas de verdad, contra dónde dijiste que irías.",
  "Total words":"Palabras totales","Progress":"Avance","set a target":"pon una meta","Streak":"Racha","day in a row":"día seguido","days in a row":"días seguidos",
  "Manuscript progress":"Avance del manuscrito","Today's goal":"Meta de hoy","Checks & balances":"Revisión de estructura","Chapter breakdown":"Por capítulo","No scenes yet.":"Todavía no hay escenas.",
  "No title set in your Book Contract.":"Tu contrato del libro no tiene título.",
  "No target word count — you can't measure progress without one.":"No hay meta de palabras; sin ella no puedes medir tu avance.",
  "No logline yet. The book doesn't know what it is.":"Todavía no hay logline. El libro no sabe qué es.",
  "No outline and no scenes. You're free-writing into the void.":"No hay esquema ni escenas. Estás escribiendo al vacío.",
  "Your deadline has passed.":"Tu fecha límite ya pasó.",
  "✓ No structural issues detected. Keep going.":"✓ No hay problemas de estructura. Sigue así.",
  "Manuscript & Backup":"Manuscrito y respaldo",
  "Your book is saved on this phone as you write, no internet needed. Export a backup now and then (to Drive, email or anywhere) so it survives a lost or broken phone.":"Tu libro se guarda en este celular mientras escribes, sin internet. Exporta un respaldo de vez en cuando (a Drive, al correo o a donde quieras) para no perderlo si se pierde o se rompe el celular.",
  "Export manuscript (.md)":"Exportar manuscrito (.md)","Export data backup (.json)":"Exportar respaldo (.json)","Import backup":"Importar respaldo","Erase everything":"Borrar todo","Tap again to confirm erase":"Toca otra vez para borrar todo",
  // settings
  "Muse, how MuseBook looks, and where your book is saved.":"Muse, cómo se ve MuseBook y dónde se guarda tu libro.",
  "Typewriter, brass and lamplight":"Máquina de escribir, latón y luz de lámpara","Sand, sea glass and driftwood":"Arena, vidrio de mar y madera de playa",
  "Lamplight, brass and stained glass":"Faroles, latón y vitrales","Star charts and brass":"Cartas de estrellas y latón","The Writing Room":"El Cuarto de Escribir",
  "Linen, walnut and a warm lamp":"Lino, nogal y una lámpara tibia","Calm: no movement, no tilt. Same look, quieter.":"Calma: sin movimiento ni inclinación. El mismo ambiente, más tranquilo.",
  "What do these keys do?":"¿Qué hace cada tecla?","Hold any key for a second to see its name. Here they all are.":"Mantén el dedo sobre una tecla un segundo para ver su nombre. Aquí están todas.",
  "Stages":"Etapas","Opens the list of stages: your plan, characters, scenes and writing.":"Abre la lista de etapas: tu plan, personajes, escenas y escritura.",
  "Language, Muse, how MuseBook looks, and backups.":"Idioma, Muse, cómo se ve MuseBook y respaldos.",
  "Makes the selected words bold.":"Pone en negritas las palabras elegidas.","Makes the selected words italic.":"Pone en cursiva las palabras elegidas.",
  "Draws a line under the selected words.":"Subraya las palabras elegidas.","Changes the letters of the selected words.":"Cambia el tipo de letra de las palabras elegidas.",
  "Makes the selected words bigger or smaller.":"Hace más grandes o más chicas las palabras elegidas.","Colors the selected words.":"Da color a las palabras elegidas.",
  "Headings, quotes, alignment and clearing a style.":"Títulos, citas, alineación y quitar un estilo.","Takes back your last change.":"Quita tu último cambio.",
  "Puts back what you just undid.":"Vuelve a poner lo que acabas de deshacer.","Ask for an idea when you're stuck. Only when you ask.":"Pide una idea cuando te atores. Solo cuando tú la pides.",
  "Close":"Cerrar",
  "The keyboard you type with belongs to Google (or your phone's maker), not to MuseBook. It may learn your words to suggest them; MuseBook never sees that.":"El teclado con el que escribes es de Google (o de quien hizo tu teléfono), no de MuseBook. Puede aprender tus palabras para sugerirlas; MuseBook nunca ve eso.",
  "‹ Back to my book":"‹ Volver a mi libro","How you write":"Cómo escribes","Guided":"Guiada","Full view":"Vista completa",
  "Guided shows one step at a time: your page, your chapters, and what comes next. Full view shows all six stages of planning. Your book stays the same in both.":"La guiada te muestra un paso a la vez: tu página, tus capítulos y lo que sigue. La vista completa muestra las seis etapas de planeación. Tu libro es el mismo en las dos.",
  "Sounds and vibration":"Sonidos y vibración",
  "Typewriter keys while you type (Noir)":"Teclas de máquina de escribir al escribir (Noir)",
  "Background sound on the writing page":"Sonido de fondo en la página de escritura",
  "Language":"Idioma","Atmosphere":"Ambiente","Pick how MuseBook feels while you write. Change it anytime.":"Elige cómo se siente MuseBook mientras escribes. Cámbialo cuando quieras.",
  "Calm Shore":"Costa tranquila","Noir":"Noir","City Vibe":"Ciudad","Celestial":"Celestial",
  "Saving":"Guardado","Everything saves automatically on this phone. To move your book to another phone, export a backup on the Dashboard and import it there.":"Todo se guarda solo en este celular. Para pasar tu libro a otro celular, exporta un respaldo en el Tablero e impórtalo allá.",
  "saved on this phone":"guardado en este celular","saving…":"guardando…","saved on this device only":"guardado solo en este dispositivo","starting…":"iniciando…","couldn't save — export a backup":"no se pudo guardar — exporta un respaldo",
  "MuseBook · your book, your voice. Muse only ever suggests; it never writes your book for you.":"MuseBook · tu libro, tu voz. Muse solo sugiere; nunca escribe tu libro por ti.",
  "Untitled Book":"Libro sin título","Fantasy / Thriller / Memoir…":"Fantasía / Suspenso / Memorias…","YA / Adult / Middle Grade…":"Juvenil / Adultos / Infantil…",
  "When a disgraced mapmaker discovers the kingdom's borders are moving, she must cross a country that no longer exists to warn a king who wants her dead.":"Cuando una cartógrafa caída en desgracia descubre que las fronteras del reino se mueven, debe cruzar un país que ya no existe para advertirle a un rey que la quiere muerta.",
  "Who is the hero? What do they want? What stands in the way? What's at stake if they fail?":"¿Quién es el protagonista? ¿Qué quiere? ¿Qué se lo impide? ¿Qué pierde si fracasa?",
  "Loyalty vs. truth / Grief / Belonging":"Lealtad vs. verdad / Duelo / Pertenencia",
  // Muse
  "Muse is thinking…":"Muse está pensando…","Muse is waking up…":"Muse se está despertando…",
  "3 tightened loglines":"3 loglines más pulidos","Next beat, suggested":"Siguiente momento sugerido","3 directions to try":"3 caminos para probar","A way forward":"Una forma de seguir",
  "Muse-lite · shape your logline":"Muse-lite · arma tu logline","Muse-lite · a possible next beat":"Muse-lite · un posible siguiente momento","Muse-lite · 3 directions to try":"Muse-lite · 3 caminos para probar","Muse-lite · a way forward":"Muse-lite · una forma de seguir",
  "Full Muse can't run on this phone, so Muse-lite is helping.":"Muse completo no puede funcionar en este celular, así que Muse-lite te está ayudando.",
  "Full Muse is still downloading. It will answer here once it's ready.":"Muse completo todavía se está descargando. Contestará aquí cuando esté listo.",
  "Full Muse isn't downloaded yet. Get it in Settings ⚙.":"Muse completo todavía no está descargado. Descárgalo en Ajustes ⚙.",
  "Tip: load a structure above to see every beat.":"Tip: carga una estructura arriba para ver todos los momentos.",
  "Download Muse (2.6 GB)":"Descargar Muse (2.6 GB)","Pause":"Pausar","Resume download":"Continuar descarga","Cancel and delete":"Cancelar y borrar","Remove Muse (frees 2.6 GB)":"Quitar Muse (libera 2.6 GB)","Tap again to remove":"Toca otra vez para quitarlo",
  "Muse isn't on this phone yet. It's a one-time 2.6 GB download (use wifi). After that it works offline. Until then, Muse-lite helps.":"Muse todavía no está en este celular. Es una descarga única de 2.6 GB (usa wifi). Después funciona sin internet. Mientras tanto, te ayuda Muse-lite.",
  "Muse is downloaded and works offline.":"Muse está descargado y funciona sin internet.",
  "Muse is ready and works offline.":"Muse está listo y funciona sin internet.",
  "Muse is downloaded, but this phone can't run it right now. Muse-lite is helping instead.":"Muse está descargado, pero este celular no puede usarlo ahorita. Muse-lite te está ayudando.",
  "(Running on the processor, so answers take a little longer.)":"(Funciona con el procesador, así que las respuestas tardan un poco más.)",
  "The download stopped (no connection?). Tap Resume to continue where it left off.":"La descarga se detuvo (¿sin conexión?). Toca Continuar para seguir donde se quedó.",
  "This phone can't run full Muse right now, so Muse-lite is helping instead.":"Este celular no puede usar Muse completo ahorita, así que Muse-lite te está ayudando.",
  // toasts
  "Muse is downloading. Keep writing!":"Muse se está descargando. ¡Sigue escribiendo!","You can get Muse anytime in Settings ⚙.":"Puedes descargar Muse cuando quieras en Ajustes ⚙.",
  "Couldn't open the share screen. Try again.":"No se pudo abrir la pantalla para compartir. Intenta otra vez.",
  "That file couldn't be read as a MuseBook backup.":"Ese archivo no se pudo leer como respaldo de MuseBook.",
  // backup
  "Back up your book":"Respaldar tu libro",
  "A backup keeps everything: your plan, characters, scenes and settings. Use it to bring your book back on a new phone or if something goes wrong.":"Un respaldo guarda todo: tu plan, personajes, escenas y ajustes. Sirve para recuperar tu libro en otro teléfono o si algo sale mal.",
  "Your book is saved on this phone. Back it up so it stays safe if you lose the phone.":"Tu libro se guarda en este teléfono. Respáldalo para que esté a salvo si pierdes el teléfono.",
  "No backup yet":"Todavía no hay respaldo",
  "The last backup didn't work. Tap to try again.":"El último respaldo no funcionó. Toca para intentar de nuevo.",
  "Back up now":"Respaldar ahora","Choose where":"Elegir dónde guardar","Change where":"Cambiar dónde guardar","Backup settings":"Ajustes de respaldo",
  "Pick a folder on your phone or in your cloud, like Google Drive. MuseBook saves copies there. We never see them.":"Elige una carpeta en tu teléfono o en tu nube, como Google Drive. MuseBook guarda ahí las copias. Nosotros nunca las vemos.",
  "In Drive, open or create a folder first (like MuseBook).":"En Drive, primero abre o crea una carpeta (por ejemplo, MuseBook).",
  "Back up when I stop writing":"Respaldar al dejar de escribir",
  "Restore from a backup":"Restaurar un respaldo","Send a copy":"Enviar una copia",
  "Backup saved":"Respaldo guardado",
  "We couldn't save the backup. Check the place you chose.":"No pudimos guardar el respaldo. Revisa el lugar que elegiste.",
  "That file isn't a MuseBook backup.":"Ese archivo no es un respaldo de MuseBook.",
  "Restore this backup?":"¿Restaurar este respaldo?",
  "It will replace the book on this phone. First we save a safety copy of your current book.":"Reemplazará el libro de este teléfono. Antes guardamos una copia de seguridad de tu libro actual.",
  "Restore":"Restaurar","Cancel":"Cancelar","Book restored":"Libro restaurado",
  "We couldn't save a safety copy, so nothing was changed.":"No pudimos guardar una copia de seguridad, así que no se cambió nada.",
  "Your latest changes aren't backed up yet.":"Tus últimos cambios todavía no tienen respaldo.",
  "this phone":"este teléfono",
  "Share your manuscript":"Compartir tu manuscrito",
  "The manuscript is only the text of your book, chapter by chapter, to read or send to someone. It doesn't include your plan or notes.":"El manuscrito es solo el texto de tu libro, por capítulos, para leerlo o enviarlo. No incluye tu plan ni tus notas.",
  "Text (.md)":"Texto (.md)",
  // book parts
  "What is it?":"¿Qué es?","Normal scene":"Escena normal","Prologue":"Prólogo","Epilogue":"Epílogo","Dedication":"Dedicatoria",
  "There's no written text yet. Write a scene first.":"Todavía no hay texto escrito. Escribe primero una escena."
};

// Phrases with numbers or names inside. [pattern, Spanish replacement]
const ES_RULES = [
  [/^Your deadline requires ~(.+) words\/day but your goal is (.+)\. Either extend the deadline, lower the target, or raise your daily goal\.$/, "Tu fecha límite pide unas $1 palabras al día, pero tu meta es $2. Mueve la fecha, baja la meta total o sube tu meta diaria."],
  [/^(.+) words per chapter is very long\. Most chapters land between 1,500 and 4,000\.$/, "$1 palabras por capítulo es mucho. La mayoría de los capítulos tienen entre 1,500 y 4,000."],
  [/^(\d+) scene\(s\) missing a goal, conflict, or outcome\.$/, "$1 escena(s) sin meta, conflicto o resultado."],
  [/^You need (.+) words\/day to finish on time, but your goal is (.+)\.$/, "Necesitas $1 palabras al día para terminar a tiempo, pero tu meta es $2."],
  [/^Reading (Prologue|Epilogue|Dedication) straight through — (\d+) scenes?\.$/, (m, k, n) => "Leyendo " + ({Prologue:"el prólogo",Epilogue:"el epílogo",Dedication:"la dedicatoria"})[k] + " de corrido — " + n + (n==="1"?" escena.":" escenas.")],
  [/^Reading Chapter (.+) straight through — (\d+) scenes?\.$/, (m, c, n) => "Leyendo el capítulo " + c + " de corrido — " + n + (n==="1"?" escena.":" escenas.")],
  [/^Downloading Muse… (\d+)% \((.+) of 2\.6 GB\)\. You can keep writing\. Keep MuseBook open; if you leave, it pauses\.$/, "Descargando Muse… $1% ($2 de 2.6 GB). Puedes seguir escribiendo. Deja MuseBook abierto; si te sales, se pausa."],
  [/^Download paused at (\d+)%\. Resume continues where it left off\.$/, "Descarga en pausa al $1%. Al continuar, sigue donde se quedó."],
  [/^From the (.+) structure:$/, (m, n) => "De la estructura " + (ES[n]||n) + ":"],
  [/^Muse needs about (.+) GB of free space on this phone\. Free some up and try again\.$/, "Muse necesita unos $1 GB libres en este celular. Libera espacio e intenta otra vez."],
  [/^of (.+) target$/, "de una meta de $1"], [/^(.+) to go$/, "faltan $1"], [/^(\d+) with words$/, "$1 con palabras"],
  [/^(\d+)% of target words$/, "$1% de la meta"], [/^(\d+)% of (.+) words$/, "$1% de $2 palabras"],
  [/^(.+) of (.+) words today$/, "$1 de $2 palabras hoy"],
  [/^(\d+) scenes? · (.+) words$/, (m, n, w) => n + (n==="1"?" escena · ":" escenas · ") + w + (w==="1"?" palabra":" palabras")],
  [/^(.+) words written$/, (m, w) => w + (w==="1"?" palabra escrita":" palabras escritas")],
  [/^([✓○]) (.+)$/, (m, mark, rest) => mark + " " + (ES[rest] ?? rest)],
  [/^Last backup: (.+) · (.+)$/, "Último respaldo: $1 · $2"],
  [/^Copies go to: (.+)$/, "Las copias van a: $1"],
  [/^([\s\S]+) · ([\d,]+) words( · saved (.+))?$/, (m, title, w, s, when) => title + " · " + w + (w==="1"?" palabra":" palabras") + (s ? " · guardado " + when : "")],
  [/^Chapter (.+)$/, "Capítulo $1"], [/^Entry (\d+)$/, "Entrada $1"], [/^Beat (\d+)$/, "Momento $1"],
  [/^Scene (\d+)( · [\s\S]*)?$/, (m, n, rest) => "Escena " + n + (rest || "")],
  // Scene picker: "3. Untitled scene (Ch 2)" — the title in between is the writer's.
  [/^(\d+\. )(.*?)( \((?:Ch ([^)]*)|(Prologue|Epilogue|Dedication))\))?$/, (m, n, title, ch, c, k) =>
    n + (title==="Untitled scene" ? "Escena sin título" : title) + (k ? " ("+ES[k]+")" : ch ? " (Cap. "+c+")" : "")]
];

const TEMPLATES_ES = {
  "3-Act":[
    ["Acto I — Exposición","1","El mundo de siempre. Presenta al protagonista, su defecto y lo que le falta."],
    ["Acto I — Detonante","1","Lo que rompe la normalidad y ya no se puede deshacer."],
    ["Acto I — Primer punto de giro","1","El protagonista se compromete. La puerta al mundo de antes se cierra."],
    ["Acto II — Acción creciente","2","Mundo nuevo, reglas nuevas. El protagonista batalla y se adapta."],
    ["Acto II — Punto medio","2","Una revelación voltea la historia. Lo que está en juego crece."],
    ["Acto II — Punto de presión","2","El antagonista aprieta. Los defectos del protagonista le cuestan caro."],
    ["Acto II — Segundo punto de giro","2","Todo está perdido. El protagonista encuentra la última pieza que le faltaba."],
    ["Acto III — Clímax","3","El enfrentamiento final. El protagonista demuestra que cambió."],
    ["Acto III — Resolución","3","La nueva normalidad. La pregunta del tema tiene respuesta."]
  ],
  "Save the Cat":[
    ["Imagen inicial","1","Una foto del mundo del protagonista antes de que todo cambie."],
    ["Tema expuesto","1","Alguien dice el tema en voz alta. El protagonista todavía no lo entiende."],
    ["Planteamiento","1","Presenta a los personajes y todo lo que necesita arreglarse."],
    ["Catalizador","1","La noticia, el golpe en la puerta, la muerte: aquí empieza la historia."],
    ["Debate","1","¿Debo ir? ¿Puedo ir? El protagonista duda."],
    ["Entrada al segundo acto","1","El protagonista decide entrar al mundo nuevo."],
    ["Historia B","2","La relación que carga el tema."],
    ["Diversión y juegos","2","La promesa de la premisa. Lo que el lector vino a ver."],
    ["Punto medio","2","Una falsa victoria o una falsa derrota. Sube lo que está en juego. Empieza la cuenta regresiva."],
    ["Los malos se acercan","2","Presión de afuera y grietas por dentro."],
    ["Todo está perdido","2","El punto más bajo. Algo muere. Un aroma a muerte."],
    ["La noche oscura del alma","2","El protagonista se hunde y tiene que quedarse ahí un rato."],
    ["Entrada al tercer acto","3","Una idea nueva, nacida de la historia B. El protagonista ya tiene lo que necesita."],
    ["Final","3","El protagonista ataca. Tiene que usar quien es ahora para ganar."],
    ["Imagen final","3","El espejo de la imagen inicial: la prueba del cambio."]
  ],
  "Hero's Journey":[
    ["El mundo ordinario","1","La normalidad del héroe y sus límites."],
    ["La llamada a la aventura","1","Algo le exige irse."],
    ["El rechazo de la llamada","1","El miedo, el deber o la duda lo frenan."],
    ["El encuentro con el mentor","1","Un guía, una herramienta o un conocimiento."],
    ["El cruce del umbral","1","Se compromete. Ya no hay vuelta atrás."],
    ["Pruebas, aliados y enemigos","2","El mundo nuevo enseña y lastima."],
    ["Acercamiento a la cueva más profunda","2","La preparación para lo más difícil."],
    ["La odisea","2","Muerte y renacimiento, literal o emocional."],
    ["La recompensa","2","Sobrevive y se lleva algo consigo."],
    ["El camino de regreso","2","Las consecuencias lo persiguen hasta casa."],
    ["La resurrección","3","La prueba final. Debe demostrar un cambio de verdad."],
    ["El regreso con el elíxir","3","Vuelve a casa distinto y trae algo consigo."]
  ],
  "Romance Beats":[
    ["Planteamiento","1","Muestra la vida de los dos protagonistas y lo que les falta."],
    ["El encuentro","1","El primer contacto. Chispas, fricción o desastre."],
    ["Ni loco","1","Una razón por la que no pueden estar juntos, dicha en la página."],
    ["Unidos a la fuerza","2","Las circunstancias los obligan a estar cerca."],
    ["Diversión y juegos","2","El enamoramiento. La química a la vista."],
    ["Punto medio","2","Vulnerabilidad. El primer beso de verdad o una confesión."],
    ["La ruptura","2","La mentira que creen sobre sí mismos lo arruina todo."],
    ["El momento oscuro","2","Los dos solos, seguros de que se acabó."],
    ["El gran gesto","3","Uno de los dos demuestra que cambió."],
    ["Felices para siempre","3","Juntos, en nuevos términos."]
  ],
  "Memoir":[
    ["Antes de mí","1","De dónde vienes: tus padres, tus abuelos, el mundo en el que naciste."],
    ["La infancia","1","La casa donde creciste. Un recuerdo que muestre quién eras."],
    ["La primera grieta","1","El momento en que entendiste que el mundo no era como creías."],
    ["La partida","2","Cuando dejaste tu casa, tu país o a la persona que eras."],
    ["La lucha","2","Lo que la vida te puso enfrente y cómo lo peleaste."],
    ["El punto de quiebre","2","La decisión o la pérdida que cambió el rumbo de tu vida."],
    ["Lo que costó","2","Lo que perdiste o dejaste en el camino."],
    ["En quién te convertiste","3","La persona que eres ahora y lo que por fin entendiste."],
    ["Hoy","3","Dónde estás ahora. Lo que quieres que el lector se lleve."]
  ]
};

const LITE_ES = {
  logline:[
    "Contesta estas cuatro y luego júntalas en una sola oración:\n1. ¿Quién es tu protagonista?\n2. ¿Qué quiere más que nada?\n3. ¿Qué se lo impide?\n4. ¿Qué pierde si fracasa?",
    "Prueba esta forma:\n\"Cuando [pasa algo], [tu protagonista] debe [hacer algo difícil] antes de que [lo que está en juego].\"\nLlena los corchetes con tu historia."
  ],
  stuck:[
    "¿Qué quiere tu personaje en este momento exacto? Haz que alguien se lo impida.",
    "Brinca al momento justo antes de que todo salga mal. ¿Qué nota primero?",
    "Dale a un personaje secundario un secreto que salga a la luz aquí.",
    "¿Qué es lo peor que podría pasar ahora? Deja que pase y mira cómo reaccionan.",
    "Cambia el lugar. Lleva la escena a un sitio más chico, más ruidoso o más peligroso.",
    "Deja que tu protagonista cometa un error que pagará después.",
    "Empieza con una línea de diálogo que sorprenda al lector.",
    "¿Qué esconde tu personaje en esta escena? Que alguien casi lo descubra.",
    "Ponle reloj: algo tiene que pasar en los próximos diez minutos.",
    "Escribe la escena desde el momento en que tu personaje toma una decisión.",
    "Trae de vuelta un objeto o un detalle de un capítulo anterior.",
    "¿Qué haría tu villano ahora mismo si estuviera mirando?"
  ],
  cont:[
    "Escribe una oración sobre lo que tu personaje ve, oye o huele en este momento.",
    "Que alguien entre, o que llame, con una noticia.",
    "Pregúntate: ¿qué hace tu personaje ahora de lo que se va a arrepentir?",
    "Brinca al siguiente momento importante. Después llenas el hueco.",
    "Escribe la siguiente línea como diálogo. ¿Quién habla y qué quiere?",
    "Muestra lo que siente tu personaje a través de lo que hace con las manos.",
    "Deja que algo pequeño salga mal.",
    "Escribe lo siguiente que pasa, aunque sea algo común. Primero el impulso."
  ]
};

let LANG = "en";
function detectLang(){
  const saved = DB.ui && DB.ui.lang;
  if(saved==="en"||saved==="es") return saved;
  return /^es\b/i.test(navigator.language||"") ? "es" : "en";
}
/** For text the page builds itself (Muse box labels, status lines). */
function t(en){ if(LANG!=="es") return en; return trText(en) ?? en; }
function trText(s){
  const k=s.trim(); if(!k) return null;
  if(ES[k]!==undefined) return s.replace(k, ES[k]);
  for(const [re,rep] of ES_RULES){
    if(!re.test(k)) continue;
    const out=k.replace(re, rep);
    if(out!==k) return s.replace(k, out);
  }
  return null;
}
const I18N_SKIP = ".editor, .readview, .musebox, .g-own, script, style";
const I18N_ATTRS = ["placeholder","title","aria-label","data-ph"];
function i18nNode(root){
  if(root.nodeType===3){ i18nText(root); return; }
  if(root.nodeType!==1 || (root.parentElement && root.parentElement.closest(I18N_SKIP))) return;
  // Options without a value keep their English text as the stored value.
  root.querySelectorAll && [root, ...root.querySelectorAll("option")].forEach(o=>{
    if(o.tagName==="OPTION" && !o.hasAttribute("value") && o.closest("[data-bind]")) o.setAttribute("value", o.__en ?? o.textContent);
  });
  [root, ...root.querySelectorAll("*")].forEach(el=>{
    // The editor's own hint is ours; only what's inside it is the writer's.
    if(el.parentElement && el.parentElement.closest(I18N_SKIP)) return;
    I18N_ATTRS.forEach(a=>{
      if(!el.hasAttribute(a)) return;
      el.__enAttr = el.__enAttr || {};
      if(el.__enAttr[a]===undefined || (el.getAttribute(a)!==el.__enAttr[a] && el.getAttribute(a)!==el.__trAttr?.[a])) el.__enAttr[a]=el.getAttribute(a);
      const en=el.__enAttr[a], out = LANG==="es" ? (trText(en) ?? en) : en;
      el.__trAttr = el.__trAttr || {}; el.__trAttr[a]=out;
      if(el.getAttribute(a)!==out) el.setAttribute(a,out);
    });
  });
  const tw=document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n; while((n=tw.nextNode())) i18nText(n);
}
function i18nText(n){
  const p=n.parentElement; if(!p || p.closest(I18N_SKIP)) return;
  // Re-learn the English when the page itself rewrote this node.
  if(n.__en===undefined || (n.nodeValue!==n.__tr && n.nodeValue!==n.__en)) n.__en=n.nodeValue;
  const out = LANG==="es" ? (trText(n.__en) ?? n.__en) : n.__en;
  n.__tr=out;
  if(n.nodeValue!==out) n.nodeValue=out;
}
let i18nObs=null;
function initI18n(){
  LANG=detectLang();
  document.documentElement.lang=LANG;
  i18nNode(document.body);
  if(i18nObs) return;
  i18nObs=new MutationObserver(muts=>{
    for(const m of muts){
      if(m.type==="characterData") i18nText(m.target);
      else if(m.type==="attributes") i18nNode(m.target);
      else m.addedNodes.forEach(i18nNode);
    }
  });
  i18nObs.observe(document.body,{subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:I18N_ATTRS});
}
function setLang(l){
  DB.ui.lang=l; save();
  LANG=l; document.documentElement.lang=l;
  renderAll();
  i18nNode(document.body);
  if(window.MuseNative) renderMuseCard(MuseNative.status);
  renderLangCard();
}
function renderLangCard(){
  document.querySelectorAll("#langRow button").forEach(b=>b.classList.toggle("active", b.dataset.lang===LANG));
}
