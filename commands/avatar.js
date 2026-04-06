const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('View a user\'s avatar with download options')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to view avatar of')
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 1024 });
    const serverAvatarUrl = member && member.avatar ? member.displayAvatarURL({ dynamic: true, size: 1024 }) : null;

    // Create buttons for download options
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('PNG')
        .setStyle(ButtonStyle.Link)
        .setURL(user.displayAvatarURL({ extension: 'png', size: 1024 })),
      new ButtonBuilder()
        .setLabel('JPG')
        .setStyle(ButtonStyle.Link)
        .setURL(user.displayAvatarURL({ extension: 'jpg', size: 1024 })),
      new ButtonBuilder()
        .setLabel('WebP')
        .setStyle(ButtonStyle.Link)
        .setURL(user.displayAvatarURL({ extension: 'webp', size: 1024 }))
    );

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${user.tag}'s Avatar`)
      .setImage(avatarUrl)
      .setColor(0x3498db)
      .addFields(
        { name: '🆔 User ID', value: user.id, inline: true },
        { name: '🎨 Avatar Type', value: user.avatar ? 'Custom' : 'Default', inline: true }
      )
      .setFooter({ text: 'Vital ESports Bot' })
      .setTimestamp();

    if (serverAvatarUrl) {
      embed.addFields(
        { name: '📍 Server Avatar', value: `[View Server Avatar](${serverAvatarUrl})`, inline: true }
      );
    }

    const rows = [row];
    
    // Add server avatar download buttons if applicable
    if (serverAvatarUrl && member.avatar) {
      const serverRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Server PNG')
          .setStyle(ButtonStyle.Link)
          .setURL(member.displayAvatarURL({ extension: 'png', size: 1024 })),
        new ButtonBuilder()
          .setLabel('Server JPG')
          .setStyle(ButtonStyle.Link)
          .setURL(member.displayAvatarURL({ extension: 'jpg', size: 1024 })),
        new ButtonBuilder()
          .setLabel('Server WebP')
          .setStyle(ButtonStyle.Link)
          .setURL(member.displayAvatarURL({ extension: 'webp', size: 1024 }))
      );
      rows.push(serverRow);
    }

    await interaction.reply({ embeds: [embed], components: rows, flags: MessageFlags.Ephemeral });
  },
};
