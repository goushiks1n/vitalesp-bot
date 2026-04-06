const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Deploy the ticket panel for your support system'),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: 'You need Manage Server permission to deploy the ticket panel.', flags: InteractionResponseFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setTitle('Vital ESports Support')
      .setDescription('Choose a ticket type below and our team will respond shortly.')
      .setColor(0xff0000);

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_ticket_giveaway')
        .setLabel('Giveaway')
        .setEmoji('🎁')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('open_ticket_report')
        .setLabel('Report')
        .setEmoji('🛠️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('open_ticket_partnership')
        .setLabel('Partnership')
        .setEmoji('🤝')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('open_ticket_staff')
        .setLabel('Staff')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('open_ticket_team')
        .setLabel('Team')
        .setEmoji('🎯')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.channel.send({ embeds: [embed], components: [row1, row2] });
    await interaction.editReply({ content: 'Ticket panel deployed successfully.' });
  },
};
