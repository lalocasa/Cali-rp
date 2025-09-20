const express = require("express");
const fs = require("fs");
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const app = express();
app.get("/", (req, res) => {
  res.send("🤖 Bot encendido y funcionando en Glitch!");
});
app.listen(3000, () => {
  console.log("🌍 Servidor web activo en el puerto 3000");
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;

const dataFile = "cedulas.json";

const commands = [
  new SlashCommandBuilder()
    .setName("abrir")
    .setDescription("Abrir el servidor y avisar a todos los jugadores"),
  new SlashCommandBuilder()
    .setName("cerrar")
    .setDescription("Cerrar el servidor y avisar a todos los jugadores"),
  new SlashCommandBuilder()
    .setName("crear-cedula")
    .setDescription("Registrar tu cédula colombiana y usuario de Roblox")
    .addStringOption(option =>
      option.setName("numero")
        .setDescription("Número de tu cédula (7-10 dígitos)")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("roblox")
        .setDescription("Tu usuario de Roblox")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("ver-registro")
    .setDescription("Ver tu registro o el de otro usuario")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("El usuario de Discord a consultar")
        .setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("borrar-registro")
    .setDescription("Borrar el registro de un usuario (solo administradores)")
    .addUserOption(option =>
      option.setName("usuario")
        .setDescription("El usuario cuyo registro quieres borrar")
        .setRequired(true)
    ),
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);
(async () => {
  try {
    console.log("⏳ Registrando comandos...");
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("✅ Comandos registrados.");
  } catch (error) {
    console.error(error);
  }
})();

client.on("ready", () => {
  console.log(`🤖 Bot iniciado como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "abrir") {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle("🟩🟩🟩 SERVIDOR ABIERTO 🟩🟩🟩")
      .setDescription("📢 **(JUGADORES QUE VOTARON)**\n\n👉 **POR FAVOR UNIRSE PARA NO RECIBIR UNA SANCIÓN 👀**")
      .setFooter({ text: "⚡ Administración del Servidor" })
      .setTimestamp();

    await interaction.reply({
      content: "@everyone 🚨🚨",
      embeds: [embed],
    });
  }

  if (interaction.commandName === "cerrar") {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🟥🟥🟥 SERVIDOR CERRADO 🟥🟥🟥")
      .setDescription("🔒 **EL SERVIDOR HA SIDO CERRADO**\n\n⚠️ **NO SE PERMITE EL INGRESO**")
      .setFooter({ text: "⚡ Administración del Servidor" })
      .setTimestamp();

    await interaction.reply({
      content: "@everyone ❌❌",
      embeds: [embed],
    });
  }

  if (interaction.commandName === "crear-cedula") {
    const numero = interaction.options.getString("numero");
    const robloxUser = interaction.options.getString("roblox");

    if (!/^\d{7,10}$/.test(numero)) {
      return interaction.reply({
        content: "❌ La cédula debe ser un número de **7 a 10 dígitos**, como en Colombia.",
        ephemeral: true
      });
    }

    let data = {};
    if (fs.existsSync(dataFile)) {
      data = JSON.parse(fs.readFileSync(dataFile));
    }

    if (Object.values(data).some(entry => entry.cedula === numero)) {
      return interaction.reply({
        content: "⚠️ Esa cédula ya está registrada en el sistema.",
        ephemeral: true
      });
    }

    data[interaction.user.id] = { cedula: numero, roblox: robloxUser };
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle("📇 Registro de Identidad")
      .setDescription(`✅ ${interaction.user} ha sido registrado con éxito.`)
      .addFields(
        { name: "🧑 Usuario Discord", value: `<@${interaction.user.id}>`, inline: true },
        { name: "🪪 Cédula", value: numero, inline: true },
        { name: "🎮 Usuario Roblox", value: robloxUser, inline: true },
        { name: "🌎 País", value: "🇨🇴 Colombia", inline: true }
      )
      .setFooter({ text: "Sistema de Registro RP" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "ver-registro") {
    const target = interaction.options.getUser("usuario") || interaction.user;

    let data = {};
    if (fs.existsSync(dataFile)) {
      data = JSON.parse(fs.readFileSync(dataFile));
    }

    const registro = data[target.id];
    if (!registro) {
      return interaction.reply({
        content: `❌ No se encontró un registro para ${target}.`,
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("📋 Consulta de Registro")
      .addFields(
        { name: "🧑 Usuario Discord", value: `<@${target.id}>`, inline: true },
        { name: "🪪 Cédula", value: registro.cedula, inline: true },
        { name: "🎮 Usuario Roblox", value: registro.roblox, inline: true },
        { name: "🌎 País", value: "🇨🇴 Colombia", inline: true }
      )
      .setFooter({ text: "Sistema de Registro RP" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (interaction.commandName === "borrar-registro") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({
        content: "❌ No tienes permisos para usar este comando.",
        ephemeral: true
      });
    }

    const target = interaction.options.getUser("usuario");

    let data = {};
    if (fs.existsSync(dataFile)) {
      data = JSON.parse(fs.readFileSync(dataFile));
    }

    if (!data[target.id]) {
      return interaction.reply({
        content: `⚠️ No se encontró un registro para ${target}.`,
        ephemeral: true
      });
    }

    delete data[target.id];
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));

    await interaction.reply({
      content: `🗑️ El registro de ${target} ha sido eliminado correctamente.`,
    });
  }
});

client.login(token);
