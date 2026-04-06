const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const warningsManager = require('./utils/warningsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option => option.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warn').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: 'You do not have permission to warn members.', ephemeral: true });
    }

    warningsManager.addWarning(user.id, { reason, date: new Date().toISOString(), warnedBy: interaction.user.id });

    const embed = new EmbedBuilder()
      .setTitle('User Warned')
      .setColor(0xffa500)
      .addFields(
        { name: 'User', value: user.tag, inline: true },
        { name: 'Reason', value: reason, inline: true }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },
};