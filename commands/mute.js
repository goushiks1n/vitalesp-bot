const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a user')
    .addUserOption(option => option.setName('user').setDescription('The user to mute').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for mute').setRequired(false)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.member.permissions.has('ModerateMembers')) {
      return interaction.reply({ content: 'You do not have permission to timeout members.', ephemeral: true });
    }

    try {
      const member = await interaction.guild.members.fetch(user.id);
      await member.timeout(duration * 60 * 1000, reason);
      const embed = new EmbedBuilder()
        .setTitle('User Muted')
        .setColor(0xffff00)
        .addFields(
          { name: 'User', value: user.tag, inline: true },
          { name: 'Duration', value: `${duration} minutes`, inline: true },
          { name: 'Reason', value: reason, inline: true }
        )
        .setTimestamp();
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'Failed to mute the user.', ephemeral: true });
    }
  },
};