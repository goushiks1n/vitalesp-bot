const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Get detailed information about a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to get info about')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const roles = member ? member.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString())
      .slice(0, 5) : [];

    const permissions = member ? member.permissions.toArray().slice(0, 5) : [];

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setColor(0x3498db)
      .addFields(
        { name: '🆔 User ID', value: user.id, inline: true },
        { name: '🤖 Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: '📝 System User', value: user.system ? 'Yes' : 'No', inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:f>`, inline: false }
      );

    if (member) {
      embed.addFields(
        { name: '🎮 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:f>`, inline: false },
        { name: '🏷️ Nickname', value: member.nickname || 'None', inline: true },
        { name: '🎨 Hex Color', value: member.displayHexColor || '#000000', inline: true },
        { name: `🎭 Roles (${roles.length})`, value: roles.length ? roles.join(', ') : 'None', inline: false }
      );

      if (permissions.length > 0) {
        embed.addFields(
          { name: `🔐 Key Permissions (${permissions.length})`, value: permissions.join(', '), inline: false }
        );
      }
    }

    embed.setFooter({ text: 'Vital ESports Bot' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
