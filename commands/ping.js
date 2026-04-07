const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency and API response time'),

  async execute(interaction) {
    const sent = await interaction.deferReply({ flags: MessageFlags.Ephemeral, fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    const uptimeMs = interaction.client.uptime || 0;
    const uptime = new Date(uptimeMs).toISOString().slice(11, 19);

    await interaction.editReply(`🏓 **Pong!**\n\`\`\`\nBot Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms\nUptime: ${uptime}\n\`\`\``);
  },
};
