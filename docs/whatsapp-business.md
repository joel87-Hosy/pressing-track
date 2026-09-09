# Envoi des tickets WhatsApp par pressing

## Installation serveur

1. Executer `supabase/migrations/202609090001_whatsapp.sql` dans le SQL Editor du projet existant (ou via les migrations Supabase).
2. Installer/connecter la CLI Supabase au projet, puis deployer : `supabase functions deploy whatsapp`.
3. Definir le secret `WHATSAPP_GRAPH_VERSION` avec une version Graph API encore prise en charge par l'application Meta (format `vNN.N`). Les secrets Supabase URL et service role sont fournis par l'environnement Edge Functions. Ne jamais mettre de jeton Meta ou de cle service role dans une variable VITE.

La fonction verifie chaque session avec `auth.getUser` et utilise exclusivement le pressing et le role dans `app_metadata`. Seuls les comptes admin et supervisor actifs peuvent configurer/envoyer. Les deux nouvelles tables sont reservees au service_role, sans acces navigateur. Le jeton Meta n'est jamais renvoye au navigateur ni journalise. Un numero Meta ne peut appartenir qu'a un seul pressing dans cette application.

## Configuration de chaque pressing

Connecter son propre numero a WhatsApp Business Platform dans Meta, obtenir un jeton avec les droits necessaires (notamment whatsapp_business_messaging et les droits de lecture du numero), puis approuver un modele utilitaire avec un corps a cinq parametres positionnels, sans parametres d'en-tete ou de bouton. Exemple :

> Bonjour, votre depot chez {{1}} est confirme. Ticket : {{2}}. Retrait prevu : {{3}}. Total : {{4}}. Nombre d'articles : {{5}}. Merci pour votre confiance.

Dans Parametres > WhatsApp Business, saisir Phone Number ID, jeton, nom exact et langue exacte du modele. L'enregistrement verifie le numero aupres de Meta. L'approbation et la structure du modele doivent etre verifiees dans WhatsApp Manager. Le raccordement est manuel ; aucun parcours Meta Embedded Signup n'est inclus.

## Envoi et verification

Enregistrer un depot avec un numero international (les numeros ivoiriens locaux de 10 chiffres sont aussi acceptes). Confirmer l'accord du client, puis cliquer sur Envoyer au client par WhatsApp. Le ticket doit exister dans Supabase. Les tickets seulement sauvegardes en local ne sont pas envoyes.

Tester avec les numeros de test autorises par Meta : reception, numero invalide, jeton expire, modele refuse, double clic, reouverture du ticket et tentative d'acces a un ticket d'un autre pressing. Tester aussi une coupure reseau pendant l'envoi.

Une cle unique par ticket empeche les doubles envois. Un refus explicite permet une nouvelle tentative. Un resultat incertain ou un envoi interrompu reste bloque : verifier WhatsApp Manager avant toute intervention manuelle sur `ticket_whatsapp_sends`. Ne pas supprimer automatiquement ces lignes.

`accepted` signifie que Meta a accepte la demande, pas que le client a recu ou lu le message. Le suivi livre/lu par webhook et la reception des reponses clients ne sont pas inclus. Aucun envoi reel ne fonctionne avant migration, deploiement, configuration Meta et approbation du modele. Les frais Meta s'appliquent selon les conditions du compte.
