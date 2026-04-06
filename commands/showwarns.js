const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warningsManager = require('./utils/warningsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('showwarns')
    .setDescription('Show warnings for a user')
    .addUserOption(option => option.setName('user').setDescription('The user to check').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const userWarnings = warningsManager.getWarnings(user.id);

    const embed = new EmbedBuilder()
      .setTitle(`Warnings for ${user.tag}`)
      .setColor(0x00ff00)
      .setDescription(userWarnings.length ? userWarnings.map((w, i) => `${i+1}. ${w.reason} - ${new Date(w.date).toLocaleDateString()}`).join('\n') : 'No warnings.')
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};