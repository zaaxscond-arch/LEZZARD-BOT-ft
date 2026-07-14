#!/usr/bin/env node

/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  🗿 LEZZARD BOT — WHATSAPP BOT                             ║
 * ║  🔥 KUDETA + STICKER — by @CaptainPerang__                 ║
 * ║  ⚡ SIMPLE — FULL WORK                                    ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */

const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    Browsers 
} = require('@whiskeysockets/baileys');

const fs = require('fs-extra');
const pino = require('pino');
const chalk = require('chalk');
const qr = require('qrcode-terminal');
const readline = require('readline');
const sharp = require('sharp');
const axios = require('axios');
const path = require('path');

// ==================== CONFIG ====================
const config = require('./config.json');
const logger = pino({ level: 'silent' });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ==================== LOG ====================
const log = {
    info: (msg) => console.log(chalk.cyan('[INFO]') + ' ' + msg),
    success: (msg) => console.log(chalk.green('[✓]') + ' ' + msg),
    warn: (msg) => console.log(chalk.yellow('[⚠]') + ' ' + msg),
    error: (msg) => console.log(chalk.red('[✗]') + ' ' + msg),
    cmd: (msg) => console.log(chalk.magenta('[CMD]') + ' ' + msg)
};

// ==================== BANNER ====================
console.log(chalk.yellow(`
╔═══════════════════════════════════════════════════════════════╗
║  🗿 LEZZARD BOT                                             ║
║  🔥 KUDETA + STICKER                                       ║
║  👑 Owner: ${config.owner}                                   ║
║  ⚡ Mode: FULL UNRESTRICTED                                ║
╚═══════════════════════════════════════════════════════════════╝
`));

// ==================== VARIABLES ====================
let sock = null;
let isConnected = false;
let startTime = Date.now();

// ==================== DELAY ====================
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== PAIRING ====================
async function pairWithCode(code) {
    try {
        log.info('Starting pairing for: ' + code);
        
        if (fs.existsSync(config.session_folder)) {
            fs.removeSync(config.session_folder);
            log.warn('Session cleared!');
        }

        const { state, saveCreds } = await useMultiFileAuthState(config.session_folder);
        
        sock = makeWASocket({
            logger: logger,
            auth: state,
            browser: Browsers.macOS('Desktop'),
            syncFullHistory: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false,
            version: [2, 3000, 1015901307]
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr: qrCode, pairingCode } = update;
            
            if (pairingCode) {
                console.log(chalk.green(`\n✅ PAIRING CODE: ${pairingCode}`));
                console.log(chalk.yellow(`📱 Masukkan kode di WhatsApp:`));
                console.log(chalk.yellow(`   Settings → Linked Devices → Link a Device`));
                console.log(chalk.yellow(`   Ketik kode: ${pairingCode}\n`));
            }

            if (qrCode) {
                console.log(chalk.yellow('\n[QR] Scan dengan WhatsApp:'));
                qr.generate(qrCode, { small: true });
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.red(`[✗] Disconnected: ${statusCode}`));
                
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(chalk.yellow('[⚠] Logged out, deleting session...'));
                    fs.removeSync(config.session_folder);
                    process.exit(0);
                } else {
                    console.log(chalk.yellow('[🔄] Retrying...'));
                    await delay(5000);
                    await pairWithCode(code);
                }
            } else if (connection === 'open') {
                console.log(chalk.green('\n✅ PAIRING SUCCESS!'));
                console.log(chalk.green('✅ Bot connected to WhatsApp!'));
                console.log(chalk.cyan(`📱 Bot Number: ${sock.user.id}`));
                console.log(chalk.cyan(`👑 Owner: ${config.owner}\n`));
                process.exit(0);
            }
        });

        await sock.requestPairingCode(code);
        
        await new Promise(() => {});
        
    } catch (error) {
        console.log(chalk.red(`[✗] Pairing error: ${error.message}`));
        process.exit(1);
    }
}

// ==================== CONNECT ====================
async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(config.session_folder);
        
        sock = makeWASocket({
            logger: logger,
            auth: state,
            browser: Browsers.macOS('Desktop'),
            syncFullHistory: false,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: false,
            version: [2, 3000, 1015901307]
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr: qrCode, pairingCode } = update;
            
            if (pairingCode) {
                console.log(chalk.green(`\n✅ PAIRING CODE: ${pairingCode}`));
                console.log(chalk.yellow(`📱 Masukkan kode di WhatsApp:`));
                console.log(chalk.yellow(`   Settings → Linked Devices → Link a Device`));
                console.log(chalk.yellow(`   Ketik kode: ${pairingCode}\n`));
            }

            if (qrCode) {
                console.log(chalk.yellow('\n[QR] Scan dengan WhatsApp:'));
                qr.generate(qrCode, { small: true });
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(chalk.red(`[✗] Disconnected: ${statusCode}`));
                isConnected = false;
                
                if (statusCode === DisconnectReason.loggedOut) {
                    console.log(chalk.yellow('[⚠] Logged out, deleting session...'));
                    fs.removeSync(config.session_folder);
                    process.exit(0);
                } else {
                    console.log(chalk.yellow('[🔄] Reconnecting...'));
                    await delay(5000);
                    await connectToWhatsApp();
                }
            } else if (connection === 'open') {
                isConnected = true;
                console.log(chalk.green('\n✅ Connected to WhatsApp!'));
                console.log(chalk.cyan(`📱 Bot Number: ${sock.user.id}`));
                console.log(chalk.cyan(`👑 Owner: ${config.owner}`));
                console.log(chalk.green('✅ LEZZARD BOT is ready!\n'));
            }
        });

        // ==================== MESSAGES ====================
        sock.ev.on('messages.upsert', async (m) => {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;
            
            const from = msg.key.remoteJid;
            const sender = msg.key.participant || from;
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const type = msg.key.remoteJid?.endsWith('@g.us') ? 'group' : 'private';

            log.cmd(`${type} | ${sender} | ${text}`);

            // ============ PING ============
            if (text === 'ping') {
                await sock.sendMessage(from, { text: '🏓 PONG!' });
                return;
            }

            // ============ HELP ============
            if (text === 'help' || text === '/help') {
                const help = `
╔═══════════════════════════════════════════════════════════════╗
║  🗿 LEZZARD BOT — COMMANDS                                  ║
║  👑 Owner: ${config.owner}                                   ║
╚═══════════════════════════════════════════════════════════════╝

┌───────────────────────────────────────────────────────────────┐
│ 📌 COMMANDS:                                                 │
│  ping   - Cek koneksi bot                                   │
│  help   - Menu ini                                           │
│  /kudeta [link] - Tangguhkan grup                           │
│  /sticker - Buat stiker (reply gambar)                     │
└───────────────────────────────────────────────────────────────┘

🗿 @CaptainPerang__ — BOT SIAP
`;
                await sock.sendMessage(from, { text: help });
                return;
            }

            // ============ KUDETA ============
            if (text.startsWith('/kudeta')) {
                const args = text.split(' ');
                const target = args[1];
                
                if (!target || !target.includes('chat.whatsapp.com')) {
                    await sock.sendMessage(from, { 
                        text: '📌 Format: /kudeta [link_grup]\nContoh: /kudeta https://chat.whatsapp.com/xxxxx'
                    });
                    return;
                }

                await sock.sendMessage(from, { text: '🔥 KUDETA START!\n📌 Memproses grup...\n⏳ Mohon tunggu...' });

                try {
                    const groupCode = target.split('/').pop();
                    
                    // Join grup
                    await sock.groupAcceptInvite(groupCode);
                    log.success('Joined group!');
                    
                    // Cari grup
                    const groups = await sock.groupFetchAllParticipating();
                    let targetId = null;
                    let groupName = '';
                    for (let g in groups) {
                        if (groups[g].inviteCode === groupCode) {
                            targetId = g;
                            groupName = groups[g].subject;
                            break;
                        }
                    }

                    if (!targetId) {
                        await sock.sendMessage(from, { text: '❌ Gagal menemukan grup!' });
                        return;
                    }

                    // Get members
                    const group = await sock.groupMetadata(targetId);
                    const participants = group.participants;
                    
                    let reported = 0;
                    let failed = 0;
                    const maxReport = config.max_report || 50;

                    await sock.sendMessage(from, { 
                        text: `📊 Target: ${groupName}\n👥 Member: ${participants.length}\n📌 Max Report: ${maxReport}`
                    });

                    for (let i = 0; i < Math.min(participants.length, maxReport); i++) {
                        const p = participants[i];
                        // Skip owner
                        if (p.id.includes('6282229038075')) continue;

                        try {
                            await sock.sendMessage(p.id, { 
                                text: '🚨 Laporan! Grup ini melanggar kebijakan WhatsApp.'
                            });
                            reported++;
                            
                            if (i % 10 === 0) {
                                await sock.sendMessage(from, {
                                    text: `📊 Progress: ${i}/${Math.min(participants.length, maxReport)}\n✅ Reported: ${reported}\n❌ Failed: ${failed}`
                                });
                            }
                            
                            await delay(config.delay || 5000);
                        } catch (e) {
                            failed++;
                        }
                    }

                    await sock.sendMessage(from, {
                        text: `✅ KUDETA COMPLETE!\n📌 Target: ${groupName}\n✅ Reported: ${reported}\n❌ Failed: ${failed}\n🗿 @CaptainPerang__`
                    });

                    // Leave group
                    await sock.groupLeave(targetId);
                    log.success('Left group!');

                } catch (e) {
                    await sock.sendMessage(from, { text: `❌ Error: ${e.message}` });
                }
                return;
            }

            // ============ STICKER ============
            if (text === '/sticker' || text.startsWith('/sticker ')) {
                // Cek apakah ada gambar yang di-reply
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                let imageBuffer = null;
                let imageUrl = null;

                try {
                    // Jika reply gambar
                    if (quoted?.imageMessage) {
                        const stream = await sock.downloadMediaMessage(msg.message);
                        imageBuffer = stream;
                        log.success('Image downloaded from reply!');
                    } 
                    // Jika ada URL
                    else {
                        const args = text.split(' ');
                        const url = args[1];
                        if (url && url.startsWith('http')) {
                            imageUrl = url;
                            const response = await axios.get(url, { responseType: 'arraybuffer' });
                            imageBuffer = Buffer.from(response.data);
                            log.success('Image downloaded from URL!');
                        }
                    }

                    if (!imageBuffer) {
                        await sock.sendMessage(from, { 
                            text: '📌 Format: /sticker [url]\nAtau reply gambar dengan /sticker'
                        });
                        return;
                    }

                    // Convert ke stiker
                    await sock.sendMessage(from, {
                        sticker: imageBuffer
                    });
                    log.success('Sticker sent!');

                } catch (e) {
                    await sock.sendMessage(from, { 
                        text: `❌ Gagal buat stiker: ${e.message}`
                    });
                }
                return;
            }

            // Unknown command
            if (text.startsWith('/')) {
                await sock.sendMessage(from, { 
                    text: `❌ Unknown command!\nKetik help untuk melihat daftar command`
                });
            }
        });

    } catch (error) {
        log.error(`Connection error: ${error.message}`);
        await delay(5000);
        await connectToWhatsApp();
    }
}

// ==================== MAIN ====================
async function main() {
    const args = process.argv.slice(2);

    // Create session folder
    if (!fs.existsSync(config.session_folder)) {
        fs.mkdirSync(config.session_folder, { recursive: true });
    }

    // Pairing mode
    if (args[0] === 'pair') {
        const code = args[1];
        if (!code) {
            console.log(chalk.red('[!] Usage: node index.js pair [nomor]'));
            console.log(chalk.cyan('[!] Example: node index.js pair 6282229038075'));
            process.exit(1);
        }
        await pairWithCode(code);
        return;
    }

    log.info('Starting LEZZARD BOT...');
    log.info('If using pairing code: node index.js pair [nomor]');
    await connectToWhatsApp();
}

// ==================== START ====================
main().catch(err => {
    log.error('Fatal error: ' + err.message);
    console.log(err);
});

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n[⚠] Bot stopped by user'));
    process.exit(0);
});
