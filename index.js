const express = require("express");
const app = express();

const port = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Bot ist online und aktiv!");
});

app.listen(port, "0.0.0.0", () => {
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

const discordTranscripts = require("discord-html-transcripts");
const ms = require("ms");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;

// ==========================================
// CONFIG
// ==========================================

const CATEGORIES = {
  kaufen: "1542302564538646569",
  verkaufen: "1542303195131281428",
  support: "1542303648531484763",
  giveaway: "1542304111758807130"
};

const TRANSCRIPT_CHANNEL_ID = "1542306795777695885";
const GIVEAWAY_PING_ROLE_ID = "1542466513871568926";

const activeGiveaways = new Map();

// ==========================================
// SLASH COMMANDS
// ==========================================

client.once("ready", async () => {
  console.log(`Bot online als ${client.user.tag}`);

  const commands = [
    {
      name: "panel",
      description: "Erstellt das Support- und Ticket-Panel"
    },
    {
      name: "claim",
      description: "Übernimmt dieses Ticket als Supporter"
    },
    {
      name: "close",
      description:
        "Löscht das Ticket und sendet das Transcript in den Log-Kanal"
    },
    {
      name: "giveaway-start",
      description: "Startet ein neues Gewinnspiel",
      options: [
        {
          name: "zeit",
          description: "Dauer, z.B. 12h, 30m oder 1d",
          type: 3,
          required: true
        },
        {
          name: "gewinn",
          description: "Was gibt es zu gewinnen?",
          type: 3,
          required: true
        },
        {
          name: "gewinner_anzahl",
          description: "Wie viele Gewinner?",
          type: 4,
          required: true
        }
      ]
    }
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("Starte Registrierung der Slash-Commands...");

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log("Slash-Commands erfolgreich registriert!");
  } catch (error) {
    console.error(
      "Fehler beim Registrieren der Commands:",
      error
    );
  }
});

// ==========================================
// INTERACTION CREATE
// ==========================================

client.on("interactionCreate", async (interaction) => {

  // ========================================
  // SLASH COMMANDS
  // ========================================

  if (interaction.isChatInputCommand()) {

    // ======================================
    // /panel
    // ======================================

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

      const kaufen = new ButtonBuilder()
        .setCustomId("spawner_kaufen")
        .setLabel("Spawner kaufen")
        .setEmoji("🛒")
        .setStyle(ButtonStyle.Success);

      const verkaufen = new ButtonBuilder()
        .setCustomId("spawner_verkaufen")
        .setLabel("Spawner verkaufen")
        .setEmoji("💰")
        .setStyle(ButtonStyle.Success);

      const support = new ButtonBuilder()
        .setCustomId("support_ticket")
        .setLabel("Support-Ticket")
        .setEmoji("🛠️")
        .setStyle(ButtonStyle.Secondary);

      const giveaway = new ButtonBuilder()
        .setCustomId("giveaway_claim")
        .setLabel("Giveaway-Claim")
        .setEmoji("🎉")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(
        kaufen,
        verkaufen,
        support,
        giveaway
      );

      await interaction.channel.send({
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: "✅ Panel wurde erfolgreich gepostet!",
        ephemeral: true
      });

      return;
    }

    // ======================================
    // /claim
    // ======================================

    if (interaction.commandName === "claim") {

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageChannels
        )
      ) {
        return interaction.reply({
          content:
            "❌ Du hast keine Berechtigung, Tickets zu claimen!",
          ephemeral: true
        });
      }

      await interaction.reply({
        content:
          `👋 Dieses Ticket wurde von ${interaction.user} übernommen und wird nun bearbeitet.`
      });

      return;
    }

    // ======================================
    // /close
    // ======================================

    if (interaction.commandName === "close") {

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageChannels
        )
      ) {
        return interaction.reply({
          content:
            "❌ Du hast keine Berechtigung, dieses Ticket zu schließen!",
          ephemeral: true
        });
      }

      await interaction.reply({
        content:
          "⏳ Transcript wird generiert und Ticket gelöscht...",
        ephemeral: true
      });

      try {

        const attachment =
          await discordTranscripts.createTranscript(
            interaction.channel,
            {
              limit: -1,
              fileName:
                `transcript-${interaction.channel.name}.html`,
              returnType: "attachment"
            }
          );

        const logChannel =
          interaction.guild.channels.cache.get(
            TRANSCRIPT_CHANNEL_ID
          );

        if (logChannel) {

          const logEmbed = new EmbedBuilder()
            .setTitle("📄 Ticket-Protokoll archiviert")
            .setDescription(
              `**Kanal:** ${interaction.channel.name}\n` +
              `**Geschlossen von:** ${interaction.user}`
            )
            .setColor(0xED4245)
            .setTimestamp();

          await logChannel.send({
            embeds: [logEmbed],
            files: [attachment]
          });
        }

        await interaction.channel.delete();

      } catch (error) {

        console.error(
          "Fehler beim Schließen:",
          error
        );
      }

      return;
    }

    // ======================================
    // /giveaway-start
    // ======================================

    if (interaction.commandName === "giveaway-start") {

      if (
        !interaction.member.permissions.has(
          PermissionsBitField.Flags.ManageChannels
        )
      ) {
        return interaction.reply({
          content: "❌ Keine Rechte für Giveaways!",
          ephemeral: true
        });
      }

      // Wichtig: Sofort antworten,
      // damit Discord keinen Timeout meldet.
      await interaction.deferReply({
        ephemeral: true
      });

      const zeitInput =
        interaction.options.getString("zeit");

      const gewinn =
        interaction.options.getString("gewinn");

      const gewinnerAnzahl =
        interaction.options.getInteger(
          "gewinner_anzahl"
        );

      const dauerMs = ms(zeitInput);

      if (!dauerMs || dauerMs <= 0) {
        return interaction.editReply({
          content:
            "❌ Ungültiges Zeitformat! Nutze z.B. `12h`, `30m` oder `1d`."
        });
      }

      if (gewinnerAnzahl <= 0) {
        return interaction.editReply({
          content:
            "❌ Die Gewinner-Anzahl muss mindestens 1 sein."
        });
      }

      const endZeitUnix =
        Math.floor(
          (Date.now() + dauerMs) / 1000
        );

      const giveawayId =
        Math.floor(
          Math.random() * 100000
        );

      // ====================================
      // GIVEAWAY EMBED
      // ====================================

      const giveawayEmbed =
        new EmbedBuilder()
          .setTitle(gewinn)
          .setDescription(
            `Endet: <t:${endZeitUnix}:R> (<t:${endZeitUnix}:F>)\n` +
            `Gehostet von: ${interaction.user}\n` +
            `Teilnahmen: **0**\n` +
            `Gewinner: **${gewinnerAnzahl}**\n\n` +
            `Giveaway #${giveawayId}`
          )
          .setColor(0x2F3136);

      const joinBtn =
        new ButtonBuilder()
          .setCustomId("giveaway_join")
          .setLabel("Teilnehmen")
          .setEmoji("🎉")
          .setStyle(ButtonStyle.Primary);

      const row =
        new ActionRowBuilder()
          .addComponents(joinBtn);

      // ====================================
      // ROLE PING
      // ====================================

      const pingMsg =
        await interaction.channel.send({
          content:
            `<@&${GIVEAWAY_PING_ROLE_ID}>`
        });

      const msg =
        await interaction.channel.send({
          embeds: [giveawayEmbed],
          components: [row]
        });

      // Ping-Nachricht löschen
      await pingMsg.delete().catch(() => null);

      // Admin-Erfolgsmeldung
      await interaction.editReply({
        content:
          "🎉 Giveaway wurde erfolgreich gestartet und die Rolle wurde benachrichtigt!"
      });

      // ====================================
      // GIVEAWAY SPEICHERN
      // ====================================

      activeGiveaways.set(msg.id, {
        gewinn: gewinn,
        gewinnerAnzahl: gewinnerAnzahl,
        endZeit: Date.now() + dauerMs,
        hostId: interaction.user.id,
        teilnehmer: [],
        giveawayId: giveawayId,
        channelId: interaction.channel.id
      });

      // ====================================
      // TIMER
      // ====================================

      setTimeout(async () => {

        const data =
          activeGiveaways.get(msg.id);

        if (!data) return;

        const channel =
          client.channels.cache.get(
            data.channelId
          );

        if (!channel) return;

        const fetchedMsg =
          await channel.messages
            .fetch(msg.id)
            .catch(() => null);

        if (!fetchedMsg) return;

        // ==================================
        // KEINE TEILNEHMER
        // ==================================

        if (data.teilnehmer.length === 0) {

          const noWinnersEmbed =
            new EmbedBuilder()
              .setTitle(data.gewinn)
              .setDescription(
                `Beendet!\n` +
                `Gehostet von: <@${data.hostId}>\n` +
                `Gewinner: **Niemand hat teilgenommen.**\n\n` +
                `Giveaway #${data.giveawayId}`
              )
              .setColor(0xED4245);

          await fetchedMsg.edit({
            embeds: [noWinnersEmbed],
            components: []
          });

          activeGiveaways.delete(msg.id);

          return;
        }

        // ==================================
        // GEWINNER AUSWÄHLEN
        // ==================================

        const gewinner = [];

        const copyTeilnehmer =
          [...data.teilnehmer];

        const anzahl =
          Math.min(
            data.gewinnerAnzahl,
            copyTeilnehmer.length
          );

        for (let i = 0; i < anzahl; i++) {

          const index =
            Math.floor(
              Math.random() *
              copyTeilnehmer.length
            );

          // WICHTIG: [0], damit nur die ID
          // gespeichert wird und kein Array.
          const picked =
            copyTeilnehmer.splice(
              index,
              1
            )[0];

          gewinner.push(picked);
        }

        const gewinnerMentions =
          gewinner
            .map(
              (id) => `<@${id}>`
            )
            .join(", ");

        // ==================================
        // ENDE EMBED
        // ==================================

        const endEmbed =
          new EmbedBuilder()
            .setTitle(data.gewinn)
            .setDescription(
              `Beendet!\n` +
              `Gehostet von: <@${data.hostId}>\n` +
              `Gewinner: ${gewinnerMentions}\n\n` +
              `Giveaway #${data.giveawayId}`
            )
            .setColor(0x23272A);

        await fetchedMsg.edit({
          embeds: [endEmbed],
          components: []
        });

        await channel.send({
          content:
            `🎉 Glückwunsch ${gewinnerMentions}, ` +
            `du hast das **${data.gewinn}**-Giveaway gewonnen!`
        });

        activeGiveaways.delete(msg.id);

      }, dauerMs);

      return;
    }
  }

  // ========================================
  // BUTTONS
  // ========================================

  if (interaction.isButton()) {

    // ======================================
    // GIVEAWAY JOIN
    // ======================================

    if (
      interaction.customId === "giveaway_join"
    ) {

      const data =
        activeGiveaways.get(
          interaction.message.id
        );

      if (!data) {
        return interaction.reply({
          content:
            "❌ Dieses Giveaway existiert nicht mehr oder ist beendet.",
          ephemeral: true
        });
      }

      if (
        data.teilnehmer.includes(
          interaction.user.id
        )
      ) {
        return interaction.reply({
          content:
            "❌ Du nimmst bereits an diesem Giveaway teil!",
          ephemeral: true
        });
      }

      data.teilnehmer.push(
        interaction.user.id
      );

      activeGiveaways.set(
        interaction.message.id,
        data
      );

      const endZeitUnix =
        Math.floor(
          data.endZeit / 1000
        );

      const updatedEmbed =
        new EmbedBuilder()
          .setTitle(data.gewinn)
          .setDescription(
            `Endet: <t:${endZeitUnix}:R> (<t:${endZeitUnix}:F>)\n` +
            `Gehostet von: <@${data.hostId}>\n` +
            `Teilnahmen: **${data.teilnehmer.length}**\n` +
            `Gewinner: **${data.gewinnerAnzahl}**\n\n` +
            `Giveaway #${data.giveawayId}`
          )
          .setColor(0x2F3136);

      await interaction.update({
        embeds: [updatedEmbed]
      });

      return;
    }

    // ======================================
    // TICKET BUTTONS
    // ======================================

    await interaction.deferReply({
      ephemeral: true
    });

    const channels =
      interaction.guild.channels.cache;

    const hasTicket =
      channels.some(
        (channel) =>
          channel.type ===
            ChannelType.GuildText &&
          channel.permissionOverwrites.cache.has(
            interaction.user.id
          ) &&
          (
            channel.name.includes("kauf-") ||
            channel.name.includes("verkauf-") ||
            channel.name.includes("support-") ||
            channel.name.includes("claim-")
          )
      );

    if (hasTicket) {
      return interaction.editReply({
        content:
          "❌ Du hast bereits ein offenes Ticket! Schließe dieses zuerst, bevor du ein neues öffnest."
      });
    }

    let ticketName = "ticket";
    let welcomeMessage =
      "Willkommen im Ticket!";

    let categoryId = null;

    // ======================================
    // SPAWNER KAUFEN
    // ======================================

    if (
      interaction.customId ===
      "spawner_kaufen"
    ) {

      ticketName =
        `🛒-kauf-${interaction.user.username}`;

      welcomeMessage =
        `Hallo ${interaction.user}, hier kannst du **Spawner kaufen**. ` +
        `Bitte schreibe, welche Spawner du suchst und wie viele du benötigst!`;

      categoryId =
        CATEGORIES.kaufen;
    }

    // ======================================
    // SPAWNER VERKAUFEN
    // ======================================

    else if (
      interaction.customId ===
      "spawner_verkaufen"
    ) {

      ticketName =
        `💰-verkauf-${interaction.user.username}`;

      welcomeMessage =
        `Hallo ${interaction.user}, hier kannst du **Spawner verkaufen**. ` +
        `Bitte nenne uns deine Spawner und die genaue Anzahl. ` +
        `Der Ankauf erfolgt zu unseren festen Server-Preisen!`;

      categoryId =
        CATEGORIES.verkaufen;
    }

    // ======================================
    // SUPPORT
    // ======================================

    else if (
      interaction.customId ===
      "support_ticket"
    ) {

      ticketName =
        `🛠️-support-${interaction.user.username}`;

      welcomeMessage =
        `Hallo ${interaction.user}, ein Teammitglied wird sich gleich ` +
        `um dein **Support-Anliegen** kümmern. ` +
        `Bitte beschreibe dein Problem genau.`;

      categoryId =
        CATEGORIES.support;
    }

    // ======================================
    // GIVEAWAY CLAIM
    // ======================================

    else if (
      interaction.customId ===
      "giveaway_claim"
    ) {

      ticketName =
        `🎉-claim-${interaction.user.username}`;

      welcomeMessage =
        `Herzlichen Glückwunsch ${interaction.user}! ` +
        `Du möchtest deinen **Giveaway-Gewinn einfordern**. ` +
        `Bitte sende einen Screenshot des Gewinns hier hinein.`;

      categoryId =
        CATEGORIES.giveaway;
    }

    // ======================================
    // UNBEKANNTER BUTTON
    // ======================================

    else {
      return interaction.editReply({
        content:
          "❌ Dieser Button ist nicht bekannt."
      });
    }

    // ======================================
    // TICKET ERSTELLEN
    // ======================================

    try {

      const ticketChannel =
        await interaction.guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          parent: categoryId,

          permissionOverwrites: [

            // @everyone
            {
              id:
                interaction.guild.roles
                  .everyone.id,

              deny: [
                PermissionsBitField.Flags
                  .ViewChannel
              ]
            },

            // User
            {
              id: interaction.user.id,

              allow: [
                PermissionsBitField.Flags
                  .ViewChannel,

                PermissionsBitField.Flags
                  .SendMessages,

                PermissionsBitField.Flags
                  .ReadMessageHistory
              ]
            },

            // Bot
            {
              id: client.user.id,

              allow: [
                PermissionsBitField.Flags
                  .ViewChannel,

                PermissionsBitField.Flags
                  .SendMessages,

                PermissionsBitField.Flags
                  .ReadMessageHistory,

                PermissionsBitField.Flags
                  .ManageChannels
              ]
            }
          ]
        });

      // ====================================
      // TICKET EMBED
      // ====================================

      const ticketEmbed =
        new EmbedBuilder()
          .setTitle(
            "✉️ Support-Ticket geöffnet"
          )
          .setDescription(
            welcomeMessage
          )
          .setColor(0x5865F2)
          .setTimestamp();

      await ticketChannel.send({
        embeds: [ticketEmbed]
      });

      await interaction.editReply({
        content:
          `✅ Dein Ticket wurde erfolgreich erstellt: ${ticketChannel}`
      });

    } catch (error) {

      console.error(
        "Fehler beim Erstellen des Tickets:",
        error
      );

      await interaction.editReply({
        content:
          "❌ Fehler beim Erstellen deines Tickets."
      });
    }
  }
});

// ==========================================
// CLIENT ERROR
// ==========================================

client.on("error", (error) => {
  console.error(
    "Discord Client Fehler:",
    error
  );
});

// ==========================================
// TOKEN PRÜFEN
// ==========================================

if (!TOKEN) {
  console.error(
    "❌ TOKEN wurde nicht gefunden!"
  );

  process.exit(1);
}

// ==========================================
// BOT LOGIN
// ==========================================

client.login(TOKEN);
