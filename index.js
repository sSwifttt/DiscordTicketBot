const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

const TOKEN = process.env.TOKEN;

// =========================
// BOT READY
// =========================

client.once("ready", () => {
  console.log(`Bot online als ${client.user.tag}`);
});

// =========================
// PANEL ERSTELLEN
// =========================

client.on("interactionCreate", async interaction => {
  // Nur Slash Commands
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

  // Button Interaktionen (Ticket Erstellung)
  if (interaction.isButton()) {
    const { customId, guild, user } = interaction;
    
    if (["spawner_kaufen", "spawner_verkaufen", "support_ticket", "giveaway_claim"].includes(customId)) {
      await interaction.deferReply({ ephemeral: true });

      // Ticket-Typ ermitteln
      let topic = "support";
      if (customId === "spawner_kaufen") topic = "💰-kauf";
      if (customId === "spawner_verkaufen") topic = "💎-verkauf";
      if (customId === "giveaway_claim") topic = "🎉-giveaway";

      // Channel erstellen
      try {
        const channel = await guild.channels.create({
          name: `${topic}-${user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ],
            },
          ],
        });

        const ticketEmbed = new EmbedBuilder()
          .setTitle("🎫 Ticket geöffnet")
          .setDescription(`Hallo ${user}, danke dass du ein Ticket geöffnet hast!\nKategorie: **${topic.toUpperCase()}**\n\nBitte beschreibe dein Anliegen so genau wie möglich. Ein Teammitglied wird sich gleich um dich kümmern.`)
          .setColor(0x5865F2);

        await channel.send({ embeds: [ticketEmbed] });
        await interaction.editReply({ content: `Dein Ticket wurde erstellt: ${channel}`, ephemeral: true });
      } catch (error) {
        console.error(error);
        await interaction.editReply({ content: "Fehler beim Erstellen des Kanals. Überprüfe meine Rechte.", ephemeral: true });
      }
    }
  }
});

client.login(TOKEN);
