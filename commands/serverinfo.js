const { SlashCommandBuilder, EmbedBuilder, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Get detailed information about the current server'),

  async execute(interaction) {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner();
    
    const channels = {
      text: guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size,
      voice: guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size,
      category: guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size,
    };

    const roles = guild.roles.cache.size;
    const members = guild.memberCount;
    const boosts = guild.premiumSubscriptionCount || 0;
    const boostLevel = guild.premiumTier || 0;

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .setColor(0xff0000)
      .addFields(
        { name: '🏷️ Server ID', value: guild.id, inline: true },
        { name: '👑 Owner', value: `${owner.user.tag}`, inline: true },
        { name: '📅 Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:f>`, inline: true },
        { name: '👥 Members', value: `${members}`, inline: true },
        { name: '🎭 Roles', value: `${roles}`, inline: true },
        { name: '📈 Boost Level', value: `${boostLevel} (${boosts} boosts)`, inline: true },
        { name: '💬 Channels', value: `Text: ${channels.text} | Voice: ${channels.voice} | Categories: ${channels.category}`, inline: false },
        { name: '🔐 Verification Level', value: guild.verificationLevel.toString(), inline: true },
        { name: '🌍 Region', value: guild.preferredLocale || 'Not set', inline: true }
      )
      .setFooter({ text: 'Vital ESports Bot' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
