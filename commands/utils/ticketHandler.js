const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const creds = JSON.parse(fs.readFileSync(path.join(__dirname, '../../creds.json'), 'utf8'));

const ticketTypes = {
  giveaway: {
    label: 'Giveaway Claim',
    description: 'Claim a giveaway reward or ask about an event prize.',
    style: ButtonStyle.Secondary,
    colour: 0x9b59b6
  },
  report: {
    label: 'Report',
    description: 'Report a user or server issue to staff.',
    style: ButtonStyle.Danger,
    colour: 0xe74c3c
  },
  partnership: {
    label: 'Partnership',
    description: 'Ask about partnerships and collaborations.',
    style: ButtonStyle.Success,
    colour: 0x2ecc71
  },
  staff: {
    label: 'Apply for Staff',
    description: 'Submit your application for staff review.',
    style: ButtonStyle.Primary,
    colour: 0x3498db
  },
  team: {
    label: 'Apply for Team',
    description: 'Apply to join the server team or event team.',
    style: ButtonStyle.Secondary,
    colour: 0x1abc9c
  }
};

function sanitizeChannelName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90);
}

function findStaffRole(guild) {
  return guild.roles.cache.find(role => {
    const name = role.name.toLowerCase();
    return ['staff', 'mod', 'support', 'admin'].some(keyword => name.includes(keyword));
  });
}

async function getOrCreateCategory(guild) {
  let category = guild.channels.cache.get(creds.ticketCategoryId);
  if (!category) {
    throw new Error(`Ticket category with ID ${creds.ticketCategoryId} not found. Please check your creds.json.`);
  }
  return category;
}

async function getOrCreateLogChannel(guild) {
  let logChannel = guild.channels.cache.get(creds.ticketLogChannelId);
  if (!logChannel) {
    throw new Error(`Ticket log channel with ID ${creds.ticketLogChannelId} not found. Please check your creds.json.`);
  }
  return logChannel;
}

function buildTicketEmbed(typeMeta, user, claimedBy = null) {
  return new EmbedBuilder()
    .setTitle(`${typeMeta.label}`)
    .setColor(typeMeta.colour)
    .setDescription(`${typeMeta.description}`)
    .addFields(
      { name: 'Opened by', value: `<@${user.id}>`, inline: true },
      { name: 'Status', value: claimedBy ? `Claimed by <@${claimedBy}>` : 'Waiting for staff...', inline: true },
      { name: 'Support Role', value: creds.ticketMentionRoleId ? `<@&${creds.ticketMentionRoleId}>` : 'Configured automatically', inline: false }
    )
    .setFooter({ text: 'Use the buttons below to claim or close this ticket.' })
    .setTimestamp();
}

function buildControlRow(isClaimed = false) {
  const claimButton = new ButtonBuilder()
    .setCustomId('claim_ticket')
    .setLabel(isClaimed ? 'Ticket Claimed' : 'Claim Ticket')
    .setEmoji('🧷')
    .setStyle(isClaimed ? ButtonStyle.Success : ButtonStyle.Primary)
    .setDisabled(isClaimed);

  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Close Ticket')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(claimButton, closeButton);
}

function getTicketInfo(topic) {
  if (!topic) return null;
  const ownerMatch = topic.match(/OWNER:(\d+)/);
  const typeMatch = topic.match(/TYPE:([^|]+)/);
  const claimedMatch = topic.match(/CLAIMED_BY:([^|]+)/);
  const statusMatch = topic.match(/STATUS:([^|]+)/);

  return {
    ownerId: ownerMatch?.[1] ?? null,
    typeKey: typeMatch?.[1] ?? null,
    claimedBy: claimedMatch?.[1] === 'none' ? null : claimedMatch?.[1] ?? null,
    status: statusMatch?.[1] ?? 'open'
  };
}

function isTicketManager(member) {
  if (creds.ticketMentionRoleId && member.roles.cache.has(creds.ticketMentionRoleId)) {
    return true;
  }

  return member.permissions.has(PermissionFlagsBits.ManageChannels);
}

function buildClosedRow() {
  const reopenButton = new ButtonBuilder()
    .setCustomId('reopen_ticket')
    .setLabel('Reopen Ticket')
    .setEmoji('🔓')
    .setStyle(ButtonStyle.Success);

  const deleteButton = new ButtonBuilder()
    .setCustomId('delete_ticket')
    .setLabel('Delete Ticket')
    .setEmoji('🗑️')
    .setStyle(ButtonStyle.Danger);

  return new ActionRowBuilder().addComponents(reopenButton, deleteButton);
}

async function fetchAllMessages(channel) {
  let allMessages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;
    const messages = await channel.messages.fetch(options);
    if (!messages.size) break;

    allMessages = allMessages.concat(Array.from(messages.values()));
    lastId = messages.last().id;
    if (messages.size < 100) break;
  }

  return allMessages.reverse();
}

function formatTranscript(messages) {
  return messages.map(message => {
    const time = message.createdAt.toISOString();
    const author = `${message.author.tag} (${message.author.id})`;
    const content = message.content || '';
    const attachments = message.attachments.size ? `\nAttachments: ${message.attachments.map(a => a.url).join(', ')}` : '';
    return `[${time}] ${author}: ${content}${attachments}`;
  }).join('\n');
}

async function createTicketChannel(interaction, ticketKey) {
  const typeMeta = ticketTypes[ticketKey];
  if (!typeMeta) return null;

  const existingTicket = interaction.guild.channels.cache.find(c => c.topic?.includes(`OWNER:${interaction.user.id}`) && !c.topic?.includes('STATUS:closed'));
  if (existingTicket) {
    await interaction.reply({ content: `You already have an open ticket: ${existingTicket}`, flags: MessageFlags.Ephemeral });
    return null;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const category = await getOrCreateCategory(interaction.guild);
  const mentionRoleId = creds.ticketMentionRoleId;
  const mentionRole = mentionRoleId ? interaction.guild.roles.cache.get(mentionRoleId) : null;
  const staffRole = findStaffRole(interaction.guild);
  const rawChannelName = `ticket-${ticketKey}-${interaction.user.username}`;
  const channelName = sanitizeChannelName(rawChannelName);

  if (mentionRoleId && !mentionRole) {
    console.warn(`Configured ticket role ${mentionRoleId} not found in guild ${interaction.guild.id}. Falling back to staff role permissions if available.`);
  }

  const permissionOverwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: ['ViewChannel']
    },
    {
      id: interaction.user.id,
      allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
    },
    {
      id: interaction.client.user.id,
      allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory']
    }
  ];

  if (mentionRole) {
    permissionOverwrites.push({
      id: mentionRole.id,
      allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
    });
  } else if (staffRole) {
    permissionOverwrites.push({
      id: staffRole.id,
      allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
    });
  }

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: 0,
    parent: category.id,
    topic: `TYPE:${ticketKey}|OWNER:${interaction.user.id}|CLAIMED_BY:none|STATUS:open`,
    permissionOverwrites
  });

  const ticketEmbed = buildTicketEmbed(typeMeta, interaction.user);
  const controlRow = buildControlRow(false);

  const mentionTarget = mentionRoleId ? `<@&${mentionRoleId}>` : staffRole ? `<@&${staffRole.id}>` : 'Staff team';
  await channel.send({ content: `${interaction.user}, ${mentionTarget} will assist you shortly.`, embeds: [ticketEmbed], components: [controlRow] });

  const logChannel = await getOrCreateLogChannel(interaction.guild);
  const openEmbed = new EmbedBuilder()
    .setTitle('Ticket Opened')
    .setColor(typeMeta.colour)
    .addFields(
      { name: 'Type', value: typeMeta.label, inline: true },
      { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Channel', value: `<#${channel.id}>`, inline: true }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [openEmbed] });

  await interaction.editReply({ content: `Ticket created: ${channel}` });
  return channel;
}

async function reopenTicket(interaction) {
  const channel = interaction.channel;
  const ticketInfo = getTicketInfo(channel.topic);
  if (!ticketInfo || ticketInfo.status !== 'closed') {
    return interaction.reply({ content: 'This ticket is not closed.', flags: MessageFlags.Ephemeral });
  }

  if (!isTicketManager(interaction.member)) {
    return interaction.reply({ content: 'Only the configured ticket role or staff can reopen this ticket.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let newTopic = channel.topic.replace(/STATUS:[^|]+/, 'STATUS:open');
  newTopic = newTopic.replace(/CLAIMED_BY:[^|]+/, 'CLAIMED_BY:none');
  await channel.setTopic(newTopic);

  const typeMeta = ticketTypes[ticketInfo.typeKey];
  const ticketEmbed = buildTicketEmbed(typeMeta, { id: ticketInfo.ownerId }, null);
  ticketEmbed.data.fields = [
    { name: 'Opened by', value: `<@${ticketInfo.ownerId}>`, inline: true },
    { name: 'Status', value: 'Reopened and waiting for staff', inline: true },
    { name: 'Support Role', value: creds.ticketMentionRoleId ? `<@&${creds.ticketMentionRoleId}>` : 'Configured automatically', inline: false }
  ];

  const controlRow = buildControlRow(false);
  if (interaction.message && interaction.message.editable) {
    await interaction.message.edit({ embeds: [ticketEmbed], components: [controlRow] });
  } else {
    const botMessages = channel.messages.cache.filter(m => m.author.id === interaction.client.user.id && m.embeds.length);
    if (botMessages.size) {
      await botMessages.first().edit({ embeds: [ticketEmbed], components: [controlRow] });
    }
  }

  const logChannel = await getOrCreateLogChannel(interaction.guild);
  const reopenEmbed = new EmbedBuilder()
    .setTitle('Ticket Reopened')
    .setColor(0x2ecc71)
    .addFields(
      { name: 'Ticket', value: `<#${channel.id}>`, inline: true },
      { name: 'Reopened by', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Opened by', value: `<@${ticketInfo.ownerId}>`, inline: true }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [reopenEmbed] });
  await interaction.editReply({ content: 'Ticket reopened successfully.' });
}

async function deleteTicket(interaction) {
  const channel = interaction.channel;
  const ticketInfo = getTicketInfo(channel.topic);
  if (!ticketInfo || ticketInfo.status !== 'closed') {
    return interaction.reply({ content: 'This ticket must be closed before it can be deleted.', flags: MessageFlags.Ephemeral });
  }

  if (!isTicketManager(interaction.member)) {
    return interaction.reply({ content: 'Only the configured ticket role or staff can delete this ticket.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const messages = await fetchAllMessages(channel);
  const transcriptText = formatTranscript(messages);
  const transcriptFile = new AttachmentBuilder(Buffer.from(transcriptText, 'utf8'), { name: `transcript-${channel.name}.txt` });

  const logChannel = await getOrCreateLogChannel(interaction.guild);
  const deleteEmbed = new EmbedBuilder()
    .setTitle('Ticket Deleted')
    .setColor(0xe74c3c)
    .addFields(
      { name: 'Ticket', value: `<#${channel.id}>`, inline: true },
      { name: 'Deleted by', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Opened by', value: `<@${ticketInfo.ownerId}>`, inline: true }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [deleteEmbed], files: [transcriptFile] });
  await interaction.editReply({ content: 'Ticket deleted and transcript saved to #ticket-logs.' });
  await channel.delete();
}

async function claimTicket(interaction) {
  const channel = interaction.channel;
  const ticketInfo = getTicketInfo(channel.topic);
  if (!ticketInfo || !ticketInfo.typeKey) {
    return interaction.reply({ content: 'This is not a ticket channel.', flags: MessageFlags.Ephemeral });
  }

  if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
    const mentionRoleId = creds.ticketMentionRoleId;
    const hasRole = mentionRoleId && interaction.member.roles.cache.has(mentionRoleId);
    if (!hasRole) {
      return interaction.reply({ content: 'You need Manage Channels permission or the configured support role to claim this ticket.', flags: MessageFlags.Ephemeral });
    }
  }

  if (ticketInfo.claimedBy) {
    return interaction.reply({ content: 'This ticket has already been claimed.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const newTopic = channel.topic.replace('CLAIMED_BY:none', `CLAIMED_BY:${interaction.user.id}`);
  await channel.setTopic(newTopic);

  const ticketEmbed = EmbedBuilder.from(channel.messages.cache.filter(m => m.author.id === interaction.client.user.id && m.embeds.length).first()?.embeds[0] || buildTicketEmbed(ticketTypes[ticketInfo.typeKey], interaction.user, interaction.user.id));
  ticketEmbed.data.fields = [
    { name: 'Opened by', value: `<@${ticketInfo.ownerId}>`, inline: true },
    { name: 'Status', value: `Claimed by <@${interaction.user.id}>`, inline: true }
  ];

  const updatedRow = buildControlRow(true);
  if (interaction.message && interaction.message.editable) {
    await interaction.message.edit({ embeds: [ticketEmbed], components: [updatedRow] });
  } else {
    const botMessages = channel.messages.cache.filter(m => m.author.id === interaction.client.user.id && m.embeds.length);
    if (botMessages.size) {
      await botMessages.first().edit({ embeds: [ticketEmbed], components: [updatedRow] });
    }
  }

  const logChannel = await getOrCreateLogChannel(interaction.guild);
  const claimEmbed = new EmbedBuilder()
    .setTitle('Ticket Claimed')
    .setColor(0xf1c40f)
    .addFields(
      { name: 'Ticket', value: `<#${channel.id}>`, inline: true },
      { name: 'Claimed by', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Opened by', value: `<@${ticketInfo.ownerId}>`, inline: true }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [claimEmbed] });
  await interaction.editReply({ content: `You claimed this ticket.` });
}

async function closeTicket(interaction) {
  const channel = interaction.channel;
  const ticketInfo = getTicketInfo(channel.topic);
  if (!ticketInfo || !ticketInfo.typeKey) {
    return interaction.reply({ content: 'This is not a ticket channel.', flags: MessageFlags.Ephemeral });
  }

  if (ticketInfo.status === 'closed') {
    return interaction.reply({ content: 'This ticket is already closed.', flags: MessageFlags.Ephemeral });
  }

  const isOwner = ticketInfo.ownerId === interaction.user.id;
  const canClose = isOwner || isTicketManager(interaction.member);
  if (!canClose) {
    return interaction.reply({ content: 'You do not have permission to close this ticket.', flags: MessageFlags.Ephemeral });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  let newTopic = channel.topic;
  if (newTopic.includes('STATUS:')) {
    newTopic = newTopic.replace(/STATUS:[^|]+/, 'STATUS:closed');
  } else {
    newTopic += '|STATUS:closed';
  }
  await channel.setTopic(newTopic);

  const typeMeta = ticketTypes[ticketInfo.typeKey];
  const ticketEmbed = EmbedBuilder.from(channel.messages.cache.filter(m => m.author.id === interaction.client.user.id && m.embeds.length).first()?.embeds[0] || buildTicketEmbed(typeMeta, { id: ticketInfo.ownerId }, ticketInfo.claimedBy));
  ticketEmbed.data.fields = [
    { name: 'Opened by', value: `<@${ticketInfo.ownerId}>`, inline: true },
    { name: 'Status', value: 'Closed - waiting for reopen or delete', inline: true },
    { name: 'Support Role', value: creds.ticketMentionRoleId ? `<@&${creds.ticketMentionRoleId}>` : 'Configured automatically', inline: false }
  ];

  const closeRow = buildClosedRow();
  if (interaction.message && interaction.message.editable) {
    await interaction.message.edit({ embeds: [ticketEmbed], components: [closeRow] });
  } else {
    const botMessages = channel.messages.cache.filter(m => m.author.id === interaction.client.user.id && m.embeds.length);
    if (botMessages.size) {
      await botMessages.first().edit({ embeds: [ticketEmbed], components: [closeRow] });
    }
  }

  const logChannel = await getOrCreateLogChannel(interaction.guild);
  const closeEmbed = new EmbedBuilder()
    .setTitle('Ticket Closed')
    .setColor(0xe74c3c)
    .addFields(
      { name: 'Ticket', value: `<#${channel.id}>`, inline: true },
      { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
      { name: 'Opened by', value: `<@${ticketInfo.ownerId}>`, inline: true }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [closeEmbed] });
  await interaction.editReply({ content: 'Ticket closed. The configured role can now reopen or delete this ticket.' });
}

async function handleTicketButton(interaction) {
  const customId = interaction.customId;

  if (customId.startsWith('open_ticket_')) {
    const ticketKey = customId.replace('open_ticket_', '');
    await createTicketChannel(interaction, ticketKey);
    return true;
  }

  if (customId === 'claim_ticket') {
    await claimTicket(interaction);
    return true;
  }

  if (customId === 'close_ticket') {
    await closeTicket(interaction);
    return true;
  }

  if (customId === 'reopen_ticket') {
    await reopenTicket(interaction);
    return true;
  }

  if (customId === 'delete_ticket') {
    await deleteTicket(interaction);
    return true;
  }

  return false;
}

module.exports = {
  handleTicketButton
};