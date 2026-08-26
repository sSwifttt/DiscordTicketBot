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
  Routes
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

const TOKEN = process.env.TOKEN;

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

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "panel") {
      const embed = new EmbedBuilder()
        .setTitle("🎫 Tickets & Support")
        .setDescription(
          "Wähle unten aus, was du benötigst.\n\n" +
          "🟢 **Spawner kaufen**\n" +
          "🔵 **Spawner verkaufen**\n" +
          "🟣 **Support-Ticket öffnen**\n" +
          "🔴 **Giveaway-Claim-Ticket**"
        )
        .setColor(0x5865F2);

      const kaufen = new ButtonBuilder()
        .setCustomId("spawner_kaufen")
        .setLabel("Spawner kaufen")
        .setEmoji("🟢")
        .setStyle(ButtonStyle.Success);

      const verkaufen = new ButtonBuilder()
        .setCustomId("spawner_verkaufen")
        .setLabel("Spawner verkaufen")
        .setEmoji("🔵")
        .setStyle(ButtonStyle.Primary);

      const support = new ButtonBuilder()
        .setCustomId("support_ticket")
        .setLabel("Support-Ticket")
        .setEmoji("🟣")
        .setStyle(ButtonStyle.Secondary);

      const giveaway = new ButtonBuilder()
        .setCustomId("giveaway_claim")
        .setLabel("Giveaway-Claim")
        .setEmoji("🔴")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(kaufen, verkaufen, support, giveaway);

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  if (interaction.isButton()) {
    await interaction.reply({ content: `Ticket für "${interaction.customId}" wird erstellt...`, ephemeral: true });
  }
});

client.login(TOKEN);

              
