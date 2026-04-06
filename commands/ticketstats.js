const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketstats')
    .setDescription('View ticket statistics for the server'),

  async execute(interaction) {
    if (!interaction.member.permissions.has('ManageGuild')) {
      return interaction.reply({ content: 'You need Manage Server permission to view ticket stats.', ephemeral: true });
    }

    const category = interaction.guild.channels.cache.find(c => c.name === 'tickets' && c.type === 4);
    if (!category) {
      return interaction.reply({ content: 'No tickets category found.', ephemeral: true });
    }

    const ticketChannels = category.children.cache.filter(c => c.topic && c.topic.includes('TYPE:'));
    const openTickets = ticketChannels.filter(c => !c.topic.includes('CLAIMED_BY:')).size;
    const claimedTickets = ticketChannels.filter(c => c.topic.includes('CLAIMED_BY:') && !c.topic.includes('CLAIMED_BY:none')).size;

    const logChannel = interaction.guild.channels.cache.find(c => c.name === 'ticket-logs' && c.type === 0);
    let totalClosed = 0;
    if (logChannel) {
      const messages = await logChannel.messages.fetch({ limit: 100 });
      totalClosed = messages.filter(m => m.embeds.length && m.embeds[0].title === 'Ticket Closed').size;
    }

    const embed = new EmbedBuilder()
      .setTitle('Ticket Statistics')
      .setColor(0x3498db)
      .addFields(
        { name: 'Open Tickets', value: openTickets.toString(), inline: true },
        { name: 'Claimed Tickets', value: claimedTickets.toString(), inline: true },
        { name: 'Total Closed', value: totalClosed.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};