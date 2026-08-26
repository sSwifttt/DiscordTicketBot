const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Bot ist online und aktiv!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Webserver läuft auf Port ${port}`);
});

const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  REST,
  Routes,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

const discordTranscripts = require('discord-html-transcripts');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent 
  ]
});

const TOKEN = process.env.TOKEN;

// ==========================================
// DEINE KATEGORIE- UND KANAL-IDS (FEST EINGEBAUT)
// ==========================================
const CATEGORIES = {
  kaufen: "1542302564538646569",    
  verkaufen: "1542303195131281428", 
  support: "1542303648531484763",   
  giveaway: "1542304111758807130"   
};

// Deine feste Transcript-Kanal-ID
const TRANSCRIPT_CHANNEL_ID = "1542306795777695885"; 

// ==========================================
// SLASH COMMANDS REGISTER
// ==========================================
client.once("ready", async () => {
  console.log(`Bot online als ${client.user.tag}`);
  
  const commands = [
    { name: 'panel', description: 'Erstellt das Support- und Ticket-Panel' },
    { name: 'claim', description: 'Übernimm dieses Ticket als Supporter' },
    { name: 'close', description: 'Löscht das Ticket und sendet das Transcript in den Log-Kanal' }
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('Starte Registrierung der Slash-Commands...');
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Slash-Commands erfolgreich registriert!');
  } catch (error) {
    console.error('Fehler beim Registrieren der Commands:', error);
  }
});

// ==========================================
// INTERAKTIONEN (BEFEHLE & BUTTONS)
// ==========================================
client.on("interactionCreate", async interaction => {
  
  // 1. SLASH COMMANDS
  if (interaction.isChatInputCommand()) {
    
    if (interaction.commandName === "panel") {
      const embed = new EmbedBuilder()
        .setTitle("🎫 Tickets & Support")
        .setDescription("Wähle unten aus, was du benötigst.\n\n🛒 **Spawner kaufen**\n💰 **Spawner verkaufen**\n🛠️ **Support-Ticket öffnen**\n🎉 **Giveaway-Claim-Ticket**")
        .setColor(0x5865F2);

      const kaufen = new ButtonBuilder().setCustomId("spawner_kaufen").setLabel("Spawner kaufen").setEmoji("🛒").setStyle(ButtonStyle.Success);
      const verkaufen = new ButtonBuilder().setCustomId("spawner_verkaufen").setLabel("Spawner verkaufen").setEmoji("💰").setStyle(ButtonStyle.Success);
      const support = new ButtonBuilder().setCustomId("support_ticket").setLabel("Support-Ticket").setEmoji("🛠️").setStyle(ButtonStyle.Secondary);
      const giveaway = new ButtonBuilder().setCustomId("giveaway_claim").setLabel("Giveaway-Claim").setEmoji("🎉").setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(kaufen, verkaufen, support, giveaway);
      await interaction.reply({ embeds: [embed], components: [row] });
    }

    if (interaction.commandName === "claim") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: "❌ Du hast keine Berechtigung, Tickets zu claimen!", ephemeral: true });
      }
      await interaction.reply({ content: `👋 Dieses Ticket wurde von ${interaction.user} übernommen und wird nun bearbeitet.` });
    }

    // TICKET DIREKT LÖSCHEN MIT /CLOSE + PROTOKOLL IM TRANSCRIPT-KANAL
    if (interaction.commandName === "close") {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return interaction.reply({ content: "❌ Du hast keine Berechtigung, dieses Ticket zu schließen!", ephemeral: true });
      }

      await interaction.reply({ content: "⏳ Transcript wird generiert und Ticket gelöscht...", ephemeral: true });
      
      try {
        // 1. Erstellt das HTML-Transcript aus dem Chatverlauf
        const attachment = await discordTranscripts.createTranscript(interaction.channel, {
          limit: -1, 
          fileName: `transcript-${interaction.channel.name}.html`,
          returnType: 'attachment'
        });

        // 2. Sucht den festen Log-Kanal auf deinem Server
        const logChannel = interaction.guild.channels.cache.get(TRANSCRIPT_CHANNEL_ID);

        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle("📄 Ticket-Protokoll archiviert")
            .setDescription(`**Kanal:** \`${interaction.channel.name}\`\n**Geschlossen von:** ${interaction.user}`)
            .setColor(0xED4245)
            .setTimestamp();

          // Sendet das Transcript direkt in den Log-Kanal
          await logChannel.send({ embeds: [logEmbed], files: [attachment] });
        } else {
          console.error("Transcript-Kanal wurde nicht gefunden! ID überprüfen.");
        }

        // 3. Löscht das Ticket sofort
        await interaction.channel.delete().catch(console.error);

      } catch (e) {
        console.error("Fehler beim automatischen Löschen:", e);
        await interaction.followUp({ content: "Fehler beim Erstellen des Transcripts. Der Kanal wurde zur Sicherheit nicht gelöscht.", ephemeral: true });
      }
    }
  }

  // 2. BUTTON INTERACTIONS (TICKET ERSTELLUNG)
  if (interaction.isButton()) {
    await interaction.deferReply({ ephemeral: true });

    let ticketName = "ticket";
    let welcomeMessage = "Willkommen im Ticket!";
    let categoryId = null;

    if (interaction.customId === "spawner_kaufen") {
      ticketName = `🛒-kauf-${interaction.user.username}`;
      welcomeMessage = `Hallo ${interaction.user}, hier kannst du **Spawner kaufen**. Bitte schreibe, welche Spawner du suchst und wie viele du benötigst!`;
      categoryId = CATEGORIES.kaufen;
    } else if (interaction.customId === "spawner_verkaufen") {
      ticketName = `💰-verkauf-${interaction.user.username}`;
      welcomeMessage = `Hallo ${interaction.user}, hier kannst du **Spawner verkaufen**. Bitte nenne uns deine Spawner und die genaue Anzahl. Der Ankauf erfolgt zu unseren festen Server-Preisen!`;
      categoryId = CATEGORIES.verkaufen;
    } else if (interaction.customId === "support_ticket") {
      ticketName = `🛠️-support-${interaction.user.username}`;
      welcomeMessage = `Hallo ${interaction.user}, ein Teammitglied wird sich gleich um dein **Support-Anliegen** kümmern. Bitte beschreibe dein Problem genau.`;
      categoryId = CATEGORIES.support;
    } else if (interaction.customId === "giveaway_claim") {
      ticketName = `🎉-claim-${interaction.user.username}`;
      welcomeMessage = `Herzlichen Glückwunsch ${interaction.user}! Du möchtest deinen **Giveaway-Gewinn einfordern**. Bitte sende einen Screenshot des Gewinns hier hinein.`;
      categoryId = CATEGORIES.giveaway;
    }

    try {
      const ticketChannel = await interaction.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: categoryId, 
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
        ],
      });

      const ticketEmbed = new EmbedBuilder().setTitle("✉️ Support-Ticket geöffnet").setDescription(welcomeMessage).setColor(0x5865F2).setTimestamp();
      await ticketChannel.send({ embeds: [ticketEmbed] });
      await interaction.editReply({ content: `Dein Ticket wurde erfolgreich erstellt: ${ticketChannel}` });

    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: "Fehler beim Erstellen deines Tickets." });
    }
  }
});

client.login(TOKEN);


