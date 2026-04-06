const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency and API response time'),

  async execute(interaction) {
    const sent = await interaction.deferReply({ flags: MessageFlags.Ephemeral, fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(`🏓 **Pong!**\n\`\`\`\nBot Latency: ${latency}ms\nAPI Latency: ${apiLatency}ms\n\`\`\``);
  },
};
