# Deploying the IIM AI Assistant

This guide puts the assistant live at `https://myiim.network` on Hostinger.

## 1. Check which Hostinger plan you have

In hPanel, look at the plan name on the home page.

| Plan | What you get | Use |
| --- | --- | --- |
| **VPS** (KVM 2 or larger: 2+ CPU cores, 8 GB RAM) | Full assistant with AI answers from the local Llama model | **Section 2** (recommended) |
| **Business / Cloud web hosting** with a "Node.js" section | The app runs, but there is no AI model. Answers come from templates and the rule-based engine only | Section 3 |
| **Premium / Single web hosting** | Static sites and PHP only. This app cannot run | Upgrade to a VPS |

The AI model needs about 3 GB of RAM on its own. A KVM 1 (4 GB) is too small to run it reliably alongside the app.

## 2. VPS setup (recommended)

### 2.1 Create the server

1. hPanel → **VPS** → choose the OS **Ubuntu 24.04** (plain, no control panel).
2. Set a strong root password, or better, add your SSH key.
3. Note the server's **IP address**.

### 2.2 Point the domain at the server

hPanel → **Domains** → `myiim.network` → **DNS / Nameservers**:

| Type | Name | Points to | TTL |
| --- | --- | --- | --- |
| A | `@` | your VPS IP | 3600 |
| A | `www` | your VPS IP | 3600 |

Remove any other `A` or `AAAA` records for `@` and `www` that point elsewhere. DNS changes can take up to an hour to take effect.

### 2.3 Push the latest code

On your computer: `git push origin main`. The server downloads the app from GitHub.

### 2.4 Run the setup script

Copy the script to the server and run it. From the project folder on your computer:

```bash
scp deploy/setup-vps.sh root@<server-ip>:/root/
ssh root@<server-ip>
bash /root/setup-vps.sh myiim.network https://github.com/tanmoy99/chatbotCapstone.git you@example.com
```

The email address only receives certificate expiry notices.

**If the repository is private**, the download step stops with an authentication error. The script has already created the app user by then, so:

```bash
sudo -u iimbot mkdir -p /home/iimbot/.ssh
sudo -u iimbot ssh-keygen -t ed25519 -N "" -f /home/iimbot/.ssh/id_ed25519
sudo -u iimbot sh -c 'ssh-keyscan github.com >> /home/iimbot/.ssh/known_hosts'
cat /home/iimbot/.ssh/id_ed25519.pub
```

Add that key on GitHub (repository → Settings → Deploy keys → Add, read-only). Then run the script again with the SSH address:

```bash
bash /root/setup-vps.sh myiim.network git@github.com:tanmoy99/chatbotCapstone.git you@example.com
```

The script takes 5–10 minutes, mostly downloading the 2 GB model. It:

- installs Node.js 22, nginx, Ollama and pm2
- downloads `llama3.2:3b` and keeps it loaded in memory
- installs the app in `/opt/iim-chatbot` and runs it as the user `iimbot`
- stores live data in `/var/lib/iim-chatbot` (knowledge edits, enquiries, ratings), outside the code folder
- creates `.env` with a random admin password, **printed once at the end. Save it.**
- sets up nginx and a free HTTPS certificate
- turns on the firewall (SSH and web traffic only)
- backs up the live data every day to `/var/backups/iim-chatbot` (30 days kept)

If the certificate step fails because DNS isn't ready yet, wait, then run the `certbot` command the script prints.

### 2.5 Finish the settings

Edit `/opt/iim-chatbot/.env` (`nano /opt/iim-chatbot/.env`), then apply with `sudo -u iimbot pm2 restart iim-chatbot`.

| Setting | What to put |
| --- | --- |
| `SMTP_*`, `ENQUIRY_TO`, `ENQUIRY_FROM` | A mailbox for enquiry emails. Create one in hPanel → **Emails** (e.g. `assistant@myiim.network`); host `smtp.hostinger.com`, port `465`. Without it, enquiries only show in the admin **Enquiries** tab. |
| `HANDOFF_WHATSAPP` | IIM's WhatsApp number, digits with country code (e.g. `2348083773640`). Leave empty for email only. |
| `EMBED_ALLOWED_ORIGINS` | Sites allowed to show the chat button, e.g. `https://iim-africa.org https://www.iim-africa.org`. See [embedding.md](embedding.md). |

Every option is described in `.env.example`.

### 2.6 Check it works

- `https://myiim.network`: the header badge should say the AI is available.
- Ask "How do I renew my CDPO?". Words should start appearing within a few seconds.
- Ask "Talk to a human" and send a test enquiry; it should appear at `/admin/` → **Enquiries** (and arrive by email if SMTP is set).
- `https://myiim.network/admin/` → sign in with the printed password.

### 2.7 Updating later

Push to GitHub, then on the server:

```bash
bash /opt/iim-chatbot/deploy/update.sh
```

Visitors aren't cut off: answers in progress finish before the app restarts. Admin edits, enquiries and ratings live outside the code folder and are not affected.

### Useful commands

| Task | Command |
| --- | --- |
| App status | `sudo -u iimbot pm2 status` |
| Live logs | `sudo -u iimbot pm2 logs iim-chatbot` |
| Restart after editing `.env` | `sudo -u iimbot pm2 restart iim-chatbot` |
| Is the model loaded? | `ollama ps` |
| Restore a backup | `tar -xzf /var/backups/iim-chatbot/iim-chatbot-YYYY-MM-DD.tar.gz -C /var/lib/iim-chatbot`, then restart |

## 3. Business / Cloud web hosting (no AI model)

Use this only if a VPS isn't possible. The chat still works: fees, membership, contacts and many common questions use checked templates, and other questions get rule-based answers from the knowledge base. Free-form AI answers aren't available.

1. hPanel → **Websites** → **Add website** → **Node.js app**.
2. Connect the GitHub repository (or upload a zip of the project without `node_modules`).
3. Node.js version **22**, start command `npm start`, entry file `server.js`.
4. Add environment variables:
   - `ADMIN_PASSWORD`: a long random password
   - `TRUST_PROXY=1`
   - `OLLAMA_KEEP_WARM=false`
   - plus any of the settings in 2.5
5. Attach the domain `myiim.network` and enable SSL in hPanel.

Check with Hostinger support which folder survives redeploys. If redeploying replaces the app folder, admin knowledge edits, enquiries and ratings stored there would be lost. In that case set `KNOWLEDGE_DATA_PATH` to a persistent folder, or treat the git repository as the source of truth for the knowledge base.

## 4. Before launch

- [ ] Change the Hostinger account password that was shared by email, and turn on two-factor authentication.
- [ ] Admin password saved somewhere safe (password manager), not in email or chat.
- [ ] Confirm with IIM: the WhatsApp number, which address enquiry emails go to, and the sites that may embed the chat.
- [ ] Ask IIM to review the privacy note under the chat box and the consent wording on the enquiry form.
- [ ] Test on a phone.
