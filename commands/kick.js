const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .addUserOption(option => option.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for kick').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has('KickMembers')) {
      return interaction.reply({ content: 'You do not have permission to kick members.', ephemeral: true });
    }

    try {
      await interaction.guild.members.kick(user, reason);
      const embed = new EmbedBuilder()
        .setTitle('User Kicked')
        .setColor(0xff0000)
        .addFields(
          { name: 'User', value: user.tag, inline: true },
          { name: 'Reason', value: reason, inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to kick the user.', ephemeral: true });
    }
  },
};