// =============================================================
// integration.mjs - l'admin, branchée sur le serveur de dev
//
// L'admin n'est PAS une page du site : c'est un intermédiaire posé
// devant le serveur de développement d'Astro, le temps d'un
// `npm run dev`. Le crochet `astro:server:setup` n'est appelé que par
// ce serveur-là - ni `astro build`, ni `astro preview` ne le
// déclenchent. Rien de l'admin ne peut donc se retrouver dans dist/,
// et le site livré reste aussi statique qu'avant.
//
// Tout ce qui arrive sous /admin/ est traité ici (interface et API),
// le reste passe à Astro sans avoir été touché.
// =============================================================

import { resolve, relative, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { createHandler } from './server/handler.mjs';
import { CONFIG_FILE } from './server/settings.mjs';

export const ADMIN_PATH = '/admin';

/** @returns {import('astro').AstroIntegration} */
export default function admin() {
  return {
    name: 'socle-admin',
    hooks: {
      'astro:server:setup': ({ server, logger }) => {
        server.middlewares.use(createHandler(ADMIN_PATH));
        logger.info(`Admin disponible sur ${ADMIN_PATH}/ (serveur de dev uniquement).`);

        // socle.config.json décide des pages qui existent (« locked ») :
        // une leçon verrouillée n'a pas de page. Mais le serveur de dev
        // garde en cache la liste des pages, et ne surveille pas ce
        // fichier - lu par config.mjs, hors du graphe de modules de Vite.
        // Sans ce qui suit, une leçon verrouillée depuis l'admin (ou à la
        // main) restait servie jusqu'au redémarrage du serveur.
        //
        // On surveille donc le fichier, et à chaque changement on envoie
        // au serveur l'événement qu'Astro écoute pour vider ce cache, puis
        // on recharge les pages ouvertes dans le navigateur.
        server.watcher.add(CONFIG_FILE);
        server.watcher.on('change', (file) => {
          if (resolve(file) !== CONFIG_FILE) return;
          server.environments.ssr?.hot.send('astro:content-changed', {});
          server.environments.client?.hot.send({ type: 'full-reload', path: '*' });
        });

        // Les decks HTML que sert la page Slides (public/slides/) sont des
        // fichiers générés : modifier une leçon ou ses slides, dans l'admin
        // ou à la main, ne les touchait pas, et la consultation en ligne
        // montrait l'ancienne version jusqu'au prochain `npm run slides:html`.
        // On les régénère donc d'eux-mêmes, quelques instants après la
        // dernière modification (≈ 4 s). Le PDF, qui réclame Chrome et
        // plusieurs minutes, reste une commande à lancer à la main.
        const decks = deckRebuilder(logger);
        server.watcher.on('change', decks.onFile);
        server.watcher.on('add', decks.onFile);
        server.watcher.on('unlink', decks.onFile);
      },
    },
  };
}

/**
 * Régénère les decks HTML (comme `npm run slides:html`) quand change ce dont les decks sont faits :
 * les leçons et leurs slides, les images, le thème Marp, la configuration.
 * Une rafale d'enregistrements ne donne qu'une génération ; une
 * modification arrivée pendant la génération en relance une après.
 *
 * @param {import('astro').AstroIntegrationLogger} logger
 */
function deckRebuilder(logger) {
  const ROOT = process.cwd();
  const SOURCES = ['src/content/lecons/', 'src/assets/', 'src/styles/marp/', 'slides.demo.md', 'socle.config.json'];
  const SASS = resolve(ROOT, 'node_modules/.bin/sass');
  let timer = null;
  let running = false;
  let again = false;

  const run = () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    // `npm run slides:html` sans son `npm run brand` : celui-ci réécrit
    // src/styles/marp/_fonts.scss à chaque passage, ce qui relancerait
    // la génération, sans fin. Le thème est recompilé, puis les decks.
    const child = spawn(
      `"${SASS}" src/styles/marp/theme.scss slides/theme.css --load-path=node_modules --style expanded --no-source-map && "${process.execPath}" scripts/build-slides.mjs --format=html`,
      { cwd: ROOT, stdio: 'ignore', shell: true }
    );
    child.on('close', (code) => {
      running = false;
      if (code === 0) logger.info('Slides HTML régénérées (page Slides à jour).');
      else logger.warn(`Slides HTML : la génération a échoué (code ${code}) - lancez npm run slides:html pour voir l'erreur.`);
      if (again) {
        again = false;
        run();
      }
    });
  };

  return {
    /** @param {string} file */
    onFile(file) {
      const rel = relative(ROOT, file).split(sep).join('/');
      if (!SOURCES.some((source) => rel === source || rel.startsWith(source))) return;
      clearTimeout(timer);
      timer = setTimeout(run, 800);
    },
  };
}
