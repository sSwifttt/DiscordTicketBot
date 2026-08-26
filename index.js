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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

const TOKEN = process.env.TOKEN;

// ==========================================
// DEINE KATEGORIE-IDS (FEST EINGEBAUT)
// ==========================================
const CATEGORIES = {
  kaufen: "1542302564538646569",    
  verkaufen: "1542303195131281428", 
  support: "1542303648531484763",   
  giveaway: "1542304111758807130"   
};

// ==========================================
// SLASH COMMANDS BEIM START REGISTRIEREN
// ==========================================
client.once("ready", async () => {
  console.log(`Bot online als ${client.user.tag}`);
  
  const commands = [
    {
      name: 'panel',
      description: 'Erstellt das Support- und Ticket-Panel',
    }
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('Starte Registrierung der Slash-Commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash-Commands erfolgreich registriert!');
  } catch (error) {
    console.error('Fehler beim Registrieren der Commands:', error);
  }
});

// ==========================================
// INTERAKTIONEN (BEFEHLE & BUTTONS)
// ==========================================
client.on("interactionCreate", async interaction => {
  
  // 1. SLASH COMMAND FÜR DAS PANEL
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {
      const embed = new EmbedBuilder()
        .setTitle("🎫 Tickets & Support")
        .setDescription(
          "Wähle unten aus, was du benötigst.\n\n" +
          "🛒 **Spawner kaufen**\n" +
          "💰 **Spawner verkaufen**\n" +
          "🛠️ **Support-Ticket öffnen**\n" +
          "🎉 **Giveaway-Claim-Ticket**"
        )
        .setColor(0x5865F2);

      // Kaufen-Button (Grün mit Einkaufswagen)
      const kaufen = new ButtonBuilder()
        .setCustomId("spawner_kaufen")
        .setLabel("Spawner kaufen")
        .setEmoji("🛒")
        .setStyle(ButtonStyle.Success);

      // Verkaufen-Button (Ebenfalls Grün mit Geldsack)
      const verkaufen = new ButtonBuilder()
        .setCustomId("spawner_verkaufen")
        .setLabel("Spawner verkaufen")
        .setEmoji("💰")
        .setStyle(ButtonStyle.Success);

      // Support-Button (Grau mit Werkzeug)
      const support = new ButtonBuilder()
        .setCustomId("support_ticket")
        .setLabel("Support-Ticket")
        .setEmoji("🛠️")
        .setStyle(ButtonStyle.Secondary);

      // Giveaway-Button (Rot mit Party-Tröte)
      const giveaway = new ButtonBuilder()
        .setCustomId("giveaway_claim")
        .setLabel("Giveaway-Claim")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(kaufen, verkaufen, support, giveaway);

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // 2. TICKET-ERSTELLUNG BEI BUTTON-KLICK
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
      welcomeMessage = `Hallo ${interaction.user}, hier kannst du **Spawner verkaufen**. Bitte nenne uns deine Spawner und deine Preisvorstellung!`;
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
      // Erstellt den Kanal direkt in der richtigen Kategorie
      const ticketChannel = await interaction.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: categoryId, 
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory
            ],
          },
          {
            id: client.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ManageChannels
            ],
          }
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle("✉️ Support-Ticket geöffnet")
        .setDescription(welcomeMessage)
        .setColor(0x5865F2)
        .setTimestamp();

      await ticketChannel.send({ embeds: [ticketEmbed] });
      await interaction.editReply({ content: `Dein Ticket wurde erfolgreich erstellt: ${ticketChannel}` });

    } catch (error) {
      console.error("Fehler beim Erstellen des Kanals:", error);
      await interaction.editReply({ content: "Fehler beim Erstellen deines Tickets. Bitte stelle sicher, dass der Bot die Admin-Rolle besitzt!" });
    }
  }
});

client.login(TOKEN);

