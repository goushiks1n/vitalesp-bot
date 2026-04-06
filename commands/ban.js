const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has('BanMembers')) {
      return interaction.reply({ content: 'You do not have permission to ban members.', ephemeral: true });
    }

    try {
      await interaction.guild.members.ban(user, { reason });
      const embed = new EmbedBuilder()
        .setTitle('User Banned')
        .setColor(0xff0000)
        .addFields(
          { name: 'User', value: user.tag, inline: true },
          { name: 'Reason', value: reason, inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to ban the user.', ephemeral: true });
    }
  },
};