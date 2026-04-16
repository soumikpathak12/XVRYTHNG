import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/config/api_config.dart';
import '../../core/theme/app_colors.dart';
import '../../models/message.dart';
import '../../providers/auth_provider.dart';
import '../../providers/messages_provider.dart';
import '../../widgets/common/file_picker_bottom_sheet.dart';
import '../../widgets/common/shell_scaffold_scope.dart';
import '../../utils/melbourne_time.dart';

class MessagesScreen extends StatefulWidget {
  const MessagesScreen({super.key});

  @override
  State<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends State<MessagesScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  bool _showChat = false;

  bool get _showSearchDropdown => _searchQuery.isNotEmpty;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      final msgProvider = context.read<MessagesProvider>();
      msgProvider.loadConversations(companyId: auth.user?.companyId);
      msgProvider.loadUsers(auth.user?.companyId);
      msgProvider.startPolling(companyId: auth.user?.companyId);
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    context.read<MessagesProvider>().stopPolling();
    super.dispose();
  }

  bool get _isTablet =>
      MediaQuery.of(context).size.shortestSide >= 600;

  void _openConversation(int id) {
    final auth = context.read<AuthProvider>();
    context
        .read<MessagesProvider>()
        .openConversation(id, companyId: auth.user?.companyId);
    if (!_isTablet) {
      setState(() => _showChat = true);
    }
  }

  void _openConversationMatch(Conversation conversation) {
    final auth = context.read<AuthProvider>();
    final jumpToMessageId = conversation.lastMessage?.isSearchMatch == true
        ? conversation.lastMessage?.id
        : null;
    context
        .read<MessagesProvider>()
        .openConversation(
          conversation.id,
          companyId: auth.user?.companyId,
          jumpToMessageId: jumpToMessageId,
        );
    if (!_isTablet) {
      setState(() => _showChat = true);
    }
  }

  void _backToList() {
    setState(() => _showChat = false);
  }

  Future<void> _clearSearch() async {
    _searchController.clear();
    setState(() => _searchQuery = '');
    final auth = context.read<AuthProvider>();
    await context
        .read<MessagesProvider>()
        .loadConversations(companyId: auth.user?.companyId);
  }

  Future<void> _selectSearchResult(Conversation conversation) async {
    await _clearSearch();
    _openConversationMatch(conversation);
  }

  @override
  Widget build(BuildContext context) {
    if (_isTablet) {
      return _buildTabletLayout();
    }
    return _showChat ? _ChatView(onBack: _backToList) : _buildPhoneList();
  }

  Widget _buildPhoneList() {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Messages'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: Column(
        children: [
          _buildSearchBar(),
          if (_showSearchDropdown)
            _SearchDropdown(
              query: _searchQuery,
              onSelect: _selectSearchResult,
            )
          else
            Expanded(child: _ConversationList(onTap: _openConversationMatch)),
        ],
      ),
      floatingActionButton: _NewConversationFab(
        onConversationOpened: _openConversation,
      ),
    );
  }

  Widget _buildTabletLayout() {
    final shellLeading = ShellScaffoldScope.navigationLeading(context);
    return Scaffold(
      appBar: AppBar(
        leading: shellLeading,
        automaticallyImplyLeading: shellLeading == null,
        title: const Text('Messages'),
        actions: ShellScaffoldScope.notificationActions(),
      ),
      body: Row(
        children: [
          SizedBox(
            width: 340,
            child: Column(
              children: [
                _buildSearchBar(),
                if (_showSearchDropdown)
                  _SearchDropdown(
                    query: _searchQuery,
                    onSelect: _selectSearchResult,
                  )
                else
                  Expanded(
                    child: _ConversationList(onTap: _openConversationMatch),
                  ),
              ],
            ),
          ),
          const VerticalDivider(width: 1, color: AppColors.divider),
          Expanded(
            child: Consumer<MessagesProvider>(
              builder: (context, provider, _) {
                if (provider.activeConversationId == null) {
                  return const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.chat_bubble_outline_rounded,
                            size: 56, color: AppColors.disabled),
                        SizedBox(height: 16),
                        Text(
                          'Select a conversation',
                          style: TextStyle(
                            fontSize: 16,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  );
                }
                return const _ChatView();
              },
            ),
          ),
        ],
      ),
      floatingActionButton: _NewConversationFab(
        onConversationOpened: _openConversation,
      ),
    );
  }

  Widget _buildSearchBar() {
    return Consumer<MessagesProvider>(
      builder: (context, provider, _) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Search conversations...',
              hintStyle:
                  const TextStyle(color: AppColors.disabled, fontSize: 14),
              prefixIcon:
                  const Icon(Icons.search, color: AppColors.textSecondary),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, size: 20),
                      onPressed: _clearSearch,
                    )
                  : null,
              filled: true,
              fillColor: AppColors.surface,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    const BorderSide(color: AppColors.primary, width: 1.5),
              ),
            ),
            onChanged: (v) {
              setState(() => _searchQuery = v.trim());
              final auth = context.read<AuthProvider>();
              provider.loadConversations(
                companyId: auth.user?.companyId,
                search: v.trim().isEmpty ? null : v.trim(),
              );
            },
          ),
        );
      },
    );
  }
}

class _SearchDropdown extends StatelessWidget {
  final String query;
  final ValueChanged<Conversation> onSelect;

  const _SearchDropdown({
    required this.query,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Expanded(
      child: Consumer<MessagesProvider>(
        builder: (context, provider, _) {
          if (provider.loading) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (provider.conversations.isEmpty) {
            return Center(
              child: Text(
                'No results for "$query"',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),
            );
          }

          return Align(
            alignment: Alignment.topCenter,
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              constraints: const BoxConstraints(maxHeight: 320),
              decoration: BoxDecoration(
                color: AppColors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.divider),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 14,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(vertical: 6),
                itemCount: provider.conversations.length,
                separatorBuilder: (_, __) => const Divider(
                  height: 1,
                  indent: 64,
                  color: AppColors.divider,
                ),
                itemBuilder: (context, index) {
                  final conv = provider.conversations[index];
                  final displayName = conv.getDisplayName(auth.user?.id ?? 0);
                  final last = conv.lastMessage;
                  final preview = last?.body?.trim().isNotEmpty == true
                      ? last!.body!.trim()
                      : 'Conversation';
                  final isMsgMatch = last?.isSearchMatch == true;

                  return ListTile(
                    dense: true,
                    leading: CircleAvatar(
                      radius: 18,
                      backgroundColor: AppColors.primary.withOpacity(0.15),
                      child: Text(
                        displayName.isNotEmpty
                            ? displayName[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    title: Text(
                      displayName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    subtitle: Text(
                      isMsgMatch ? 'Message: $preview' : preview,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13,
                        color: isMsgMatch
                            ? AppColors.primary
                            : AppColors.textSecondary,
                        fontWeight:
                            isMsgMatch ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                    trailing: const Icon(
                      Icons.north_east_rounded,
                      size: 18,
                      color: AppColors.textSecondary,
                    ),
                    onTap: () => onSelect(conv),
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Conversation list
// ---------------------------------------------------------------------------

class _ConversationList extends StatelessWidget {
  final ValueChanged<Conversation> onTap;
  const _ConversationList({required this.onTap});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Consumer<MessagesProvider>(
      builder: (context, provider, _) {
        if (provider.loading && provider.conversations.isEmpty) {
          return const Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          );
        }
        if (provider.conversations.isEmpty) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.chat_bubble_outline_rounded,
                      size: 48, color: AppColors.disabled),
                  SizedBox(height: 16),
                  Text(
                    'No conversations yet',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Start a new conversation using the button below',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        }

        return RefreshIndicator(
          color: AppColors.primary,
          onRefresh: () =>
              provider.loadConversations(companyId: auth.user?.companyId),
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(vertical: 4),
            itemCount: provider.conversations.length,
            separatorBuilder: (_, __) => const Divider(
              height: 1,
              indent: 76,
              color: AppColors.divider,
            ),
            itemBuilder: (context, index) {
              final conv = provider.conversations[index];
              final isActive = conv.id == provider.activeConversationId;
              return _ConversationTile(
                conversation: conv,
                currentUserId: auth.user?.id ?? 0,
                isActive: isActive,
                onTap: () => onTap(conv),
              );
            },
          ),
        );
      },
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final Conversation conversation;
  final int currentUserId;
  final bool isActive;
  final VoidCallback onTap;

  const _ConversationTile({
    required this.conversation,
    required this.currentUserId,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final displayName = conversation.getDisplayName(currentUserId);
    final lastMsg = conversation.lastMessage;
    final preview = lastMsg?.body ?? '';
    final time = _formatTime(conversation.updatedAt);
    final hasUnread = conversation.unreadCount > 0;

    return Material(
      color: isActive ? AppColors.primary.withOpacity(0.06) : Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              _Avatar(name: displayName, size: 48),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            displayName,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: hasUnread
                                  ? FontWeight.w700
                                  : FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          time,
                          style: TextStyle(
                            fontSize: 12,
                            color: hasUnread
                                ? AppColors.primary
                                : AppColors.textSecondary,
                            fontWeight: hasUnread
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            preview.isNotEmpty ? preview : 'No messages yet',
                            style: TextStyle(
                              fontSize: 13,
                              color: hasUnread
                                  ? AppColors.textPrimary
                                  : AppColors.textSecondary,
                              fontWeight: hasUnread
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (hasUnread) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppColors.primary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              conversation.unreadCount > 99
                                  ? '99+'
                                  : '${conversation.unreadCount}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.white,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime? dt) {
    if (dt == null) return '';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final date = DateTime(dt.year, dt.month, dt.day);

    if (date == today) return DateFormat.Hm().format(dt);
    if (date == today.subtract(const Duration(days: 1))) return 'Yesterday';
    if (now.difference(dt).inDays < 7) return DateFormat.E().format(dt);
    return DateFormat('dd/MM/yy').format(dt);
  }
}

// ---------------------------------------------------------------------------
// Chat view
// ---------------------------------------------------------------------------

class _ChatView extends StatefulWidget {
  final VoidCallback? onBack;
  const _ChatView({this.onBack});

  @override
  State<_ChatView> createState() => _ChatViewState();
}

class _ChatViewState extends State<_ChatView> {
  final _msgController = TextEditingController();
  final _scrollController = ScrollController();
  final Map<int, GlobalKey> _messageKeys = {};
  bool _sending = false;
  int? _lastJumpTarget;

  bool _isAllowedAttachmentType(String filename, String? mimeType) {
    final lowerName = filename.toLowerCase();
    final lowerMime = (mimeType ?? '').toLowerCase();
    final isImage = lowerMime.startsWith('image/') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.gif') ||
        lowerName.endsWith('.webp') ||
        lowerName.endsWith('.bmp') ||
        lowerName.endsWith('.heic') ||
        lowerName.endsWith('.heif');
    final isPdf = lowerMime == 'application/pdf' || lowerName.endsWith('.pdf');
    return isImage || isPdf;
  }

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToJumpTarget(MessagesProvider provider) {
    final targetId = provider.jumpToMessageId;
    if (targetId == null || targetId == _lastJumpTarget) return;
    final key = _messageKeys[targetId];
    final contextForTarget = key?.currentContext;
    if (contextForTarget == null) return;
    _lastJumpTarget = targetId;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final currentContext = _messageKeys[targetId]?.currentContext;
      if (currentContext == null) return;
      Scrollable.ensureVisible(
        currentContext,
        alignment: 0.25,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      context.read<MessagesProvider>().clearJumpTarget();
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 100) {
      final auth = context.read<AuthProvider>();
      context
          .read<MessagesProvider>()
          .loadMoreMessages(companyId: auth.user?.companyId);
    }
  }

  Future<void> _send() async {
    final text = _msgController.text.trim();
    if (text.isEmpty) return;
    _msgController.clear();
    setState(() => _sending = true);
    try {
      final auth = context.read<AuthProvider>();
      await context
          .read<MessagesProvider>()
          .sendMessage(text, companyId: auth.user?.companyId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _pickAttachment() async {
    final result = await showFilePickerSheet(context, imageAndPdfOnly: true);
    if (result == null || !mounted) return;

    if (!_isAllowedAttachmentType(result.name, result.mimeType)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Only image files and PDFs are allowed.'),
          backgroundColor: AppColors.danger,
        ),
      );
      return;
    }

    setState(() => _sending = true);
    try {
      final auth = context.read<AuthProvider>();
      await context.read<MessagesProvider>().sendAttachment(
            result.file,
            name: result.name,
            mimeType: result.mimeType,
            companyId: auth.user?.companyId,
          );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed to send attachment: $e'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final currentUserId = auth.user?.id ?? 0;

    return Consumer<MessagesProvider>(
      builder: (context, provider, _) {
        _scrollToJumpTarget(provider);
        final convId = provider.activeConversationId;
        final conv = provider.conversations
            .where((c) => c.id == convId)
            .firstOrNull;

        final isGroup = conv?.type == 'group';

        return Column(
          children: [
            _buildChatHeader(context, conv, currentUserId),
            const Divider(height: 1, color: AppColors.divider),
            Expanded(
              child: provider.loading && provider.messages.isEmpty
                  ? const Center(
                      child: CircularProgressIndicator(
                          color: AppColors.primary))
                  : provider.messages.isEmpty
                      ? const Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.chat_outlined,
                                  size: 48, color: AppColors.disabled),
                              SizedBox(height: 12),
                              Text(
                                'No messages yet',
                                style: TextStyle(
                                  fontSize: 15,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              SizedBox(height: 4),
                              Text(
                                'Send the first message!',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: AppColors.disabled,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          controller: _scrollController,
                          reverse: true,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          itemCount: provider.messages.length,
                          itemBuilder: (context, index) {
                            final msg = provider.messages[index];
                            final messageKey = _messageKeys.putIfAbsent(
                              msg.id,
                              () => GlobalKey(),
                            );
                            final prevMsg = index < provider.messages.length - 1
                                ? provider.messages[index + 1]
                                : null;
                            final showDateSep = _shouldShowDateSeparator(
                                msg.createdAt, prevMsg?.createdAt);
                            final showSender = isGroup &&
                                !msg.isOwn &&
                                (prevMsg == null ||
                                    prevMsg.senderId != msg.senderId);

                            return Container(
                              key: messageKey,
                              child: Column(
                              children: [
                                if (showDateSep)
                                  _DateSeparator(date: msg.createdAt),
                                _ChatBubble(
                                  message: msg,
                                  showSender: showSender,
                                ),
                              ],
                              ),
                            );
                          },
                        ),
            ),
            _buildInputBar(),
          ],
        );
      },
    );
  }

  Widget _buildChatHeader(
 BuildContext context, Conversation? conv, int currentUserId) {
    final title = conv?.getDisplayName(currentUserId) ?? 'Chat';
    final participantCount = conv?.participants.length ?? 0;
    final isGroup = conv?.type == 'group';

    return Container(
      padding: EdgeInsets.fromLTRB(
        widget.onBack != null ? 4 : 16,
        8,
        8,
        8,
      ),
      color: AppColors.white,
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            if (widget.onBack != null)
              IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: widget.onBack,
                color: AppColors.textPrimary,
              ),
            _Avatar(name: title, size: 36),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (participantCount > 0)
                    Text(
                      '$participantCount participants',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                ],
              ),
            ),
            if (isGroup && conv != null)
              IconButton.filledTonal(
                onPressed: () =>
                    _openAddGroupMembers(context, conv.id, currentUserId),
                tooltip: 'Add people',
                icon: const Icon(Icons.person_add_alt_rounded, size: 20),
                color: AppColors.primary,
              ),
          ],
        ),
      ),
    );
  }

  void _openAddGroupMembers(
      BuildContext context, int conversationId, int currentUserId) {
    final auth = context.read<AuthProvider>();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.55,
        minChildSize: 0.35,
        maxChildSize: 0.92,
        expand: false,
        builder: (sheetCtx, scrollController) => _AddGroupMembersSheet(
          conversationId: conversationId,
          currentUserId: currentUserId,
          companyId: auth.user?.companyId,
          scrollController: scrollController,
        ),
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        8,
        8,
        8,
        8 + MediaQuery.of(context).padding.bottom,
      ),
      decoration: const BoxDecoration(
        color: AppColors.white,
        border: Border(top: BorderSide(color: AppColors.divider)),
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.attach_file_rounded),
            onPressed: _pickAttachment,
            color: AppColors.textSecondary,
            tooltip: 'Attach file',
          ),
          Expanded(
            child: TextField(
              controller: _msgController,
              maxLines: 4,
              minLines: 1,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(
                hintText: 'Type a message...',
                hintStyle:
                    const TextStyle(color: AppColors.disabled, fontSize: 14),
                filled: true,
                fillColor: AppColors.surface,
                contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(24),
                  borderSide: BorderSide.none,
                ),
              ),
              onSubmitted: (_) => _send(),
            ),
          ),
          const SizedBox(width: 4),
          Material(
            color: AppColors.primary,
            borderRadius: BorderRadius.circular(24),
            child: InkWell(
              borderRadius: BorderRadius.circular(24),
              onTap: _sending ? null : _send,
              child: Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                child: _sending
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.white,
                        ),
                      )
                    : const Icon(Icons.send_rounded,
                        color: AppColors.white, size: 20),
              ),
            ),
          ),
        ],
      ),
    );
  }

  bool _shouldShowDateSeparator(DateTime? current, DateTime? previous) {
    if (current == null) return false;
    if (previous == null) return true;
    return DateTime(current.year, current.month, current.day) !=
        DateTime(previous.year, previous.month, previous.day);
  }
}

// ---------------------------------------------------------------------------
// Chat bubble
// ---------------------------------------------------------------------------

class _ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final bool showSender;

  const _ChatBubble({
    required this.message,
    this.showSender = false,
  });

  @override
  Widget build(BuildContext context) {
    final isOwn = message.isOwn;
    final alignment = isOwn ? CrossAxisAlignment.end : CrossAxisAlignment.start;
    final bgColor = isOwn ? AppColors.primary : const Color(0xFFF0F0F0);
    final textColor = isOwn ? AppColors.white : AppColors.textPrimary;
    final timeColor =
        isOwn ? AppColors.white.withOpacity(0.7) : AppColors.textSecondary;

    final borderRadius = BorderRadius.only(
      topLeft: const Radius.circular(16),
      topRight: const Radius.circular(16),
      bottomLeft: Radius.circular(isOwn ? 16 : 4),
      bottomRight: Radius.circular(isOwn ? 4 : 16),
    );

    final timeStr = message.createdAt != null
        ? DateFormat.Hm().format(message.createdAt!)
        : '';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Column(
        crossAxisAlignment: alignment,
        children: [
          if (showSender && message.senderName != null)
            Padding(
              padding: EdgeInsets.only(
                left: isOwn ? 0 : 12,
                right: isOwn ? 12 : 0,
                bottom: 4,
              ),
              child: Text(
                message.senderName!,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: _senderColor(message.senderId ?? 0),
                ),
              ),
            ),
          Row(
            mainAxisAlignment:
                isOwn ? MainAxisAlignment.end : MainAxisAlignment.start,
            children: [
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxWidth: MediaQuery.of(context).size.width * 0.75,
                ),
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: borderRadius,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (message.attachments.isNotEmpty)
                        ..._buildAttachments(context, isOwn),
                      if (message.body != null && message.body!.isNotEmpty)
                        Text(
                          message.body!,
                          style: TextStyle(
                            fontSize: 14,
                            color: textColor,
                            height: 1.35,
                          ),
                        ),
                      const SizedBox(height: 4),
                      Align(
                        alignment: Alignment.bottomRight,
                        child: Text(
                          timeStr,
                          style: TextStyle(fontSize: 11, color: timeColor),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  List<Widget> _buildAttachments(BuildContext context, bool isOwn) {
    return message.attachments.map((att) {
      final urlCandidates = _buildAttachmentUrlCandidates(att.storageUrl);

      if (att.isImage && urlCandidates.isNotEmpty) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: _AttachmentImagePreview(
              urls: urlCandidates,
              filename: att.filename,
              width: 200,
            ),
          ),
        );
      }

      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: isOwn
                ? AppColors.white.withOpacity(0.15)
                : AppColors.surface,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.insert_drive_file_outlined,
                size: 18,
                color: isOwn ? AppColors.white : AppColors.textSecondary,
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  att.filename,
                  style: TextStyle(
                    fontSize: 13,
                    color: isOwn ? AppColors.white : AppColors.textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      );
    }).toList();
  }

  List<String> _buildAttachmentUrlCandidates(String? rawUrl) {
    if (rawUrl == null || rawUrl.trim().isEmpty) return const [];
    final normalizedRaw = rawUrl.trim().replaceAll('\\', '/');
    final candidates = <String>[];
    void add(String u) {
      final v = u.trim();
      if (v.isNotEmpty && !candidates.contains(v)) candidates.add(v);
    }

    if (normalizedRaw.startsWith('http')) {
      add(normalizedRaw);
    } else {
      final prefixed = normalizedRaw.startsWith('/')
          ? normalizedRaw
          : '/$normalizedRaw';
      add('${ApiConfig.baseUrl}$prefixed');
      if (prefixed.startsWith('/uploads/')) {
        add('${ApiConfig.baseUrl}/api$prefixed');
      } else if (prefixed.startsWith('/api/uploads/')) {
        add('${ApiConfig.baseUrl}${prefixed.replaceFirst('/api/uploads/', '/uploads/')}');
      }
    }
    return candidates;
  }

  Color _senderColor(int senderId) {
    const colors = [
      AppColors.primary,
      AppColors.info,
      Color(0xFF8E24AA),
      Color(0xFFE65100),
      AppColors.secondary,
      Color(0xFF1565C0),
    ];
    return colors[senderId.abs() % colors.length];
  }
}

class _AttachmentImagePreview extends StatefulWidget {
  final List<String> urls;
  final String filename;
  final double width;

  const _AttachmentImagePreview({
    required this.urls,
    required this.filename,
    required this.width,
  });

  @override
  State<_AttachmentImagePreview> createState() => _AttachmentImagePreviewState();
}

class _AttachmentImagePreviewState extends State<_AttachmentImagePreview> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    if (widget.urls.isEmpty || _index >= widget.urls.length) {
      return _broken(widget.filename, widget.width);
    }

    return Image.network(
      widget.urls[_index],
      width: widget.width,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) {
        if (_index < widget.urls.length - 1) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) setState(() => _index += 1);
          });
          return SizedBox(
            width: widget.width,
            height: 100,
            child: const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: AppColors.primary,
              ),
            ),
          );
        }
        return _broken(widget.filename, widget.width);
      },
    );
  }

  Widget _broken(String filename, double width) {
    return Container(
      width: width,
      height: 100,
      color: AppColors.surface,
      alignment: Alignment.center,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.broken_image_outlined, color: AppColors.disabled),
          const SizedBox(height: 6),
          Text(
            filename,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Date separator
// ---------------------------------------------------------------------------

class _DateSeparator extends StatelessWidget {
  final DateTime? date;
  const _DateSeparator({this.date});

  @override
  Widget build(BuildContext context) {
    if (date == null) return const SizedBox.shrink();
    final now = MelbourneTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final d = DateTime(date!.year, date!.month, date!.day);

    String label;
    if (d == today) {
      label = 'Today';
    } else if (d == today.subtract(const Duration(days: 1))) {
      label = 'Yesterday';
    } else {
      label = DateFormat('EEEE, dd MMM yyyy').format(date!);
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Row(
        children: [
          const Expanded(child: Divider(color: AppColors.divider)),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          const Expanded(child: Divider(color: AppColors.divider)),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// New conversation FAB
// ---------------------------------------------------------------------------

class _NewConversationFab extends StatelessWidget {
  final ValueChanged<int> onConversationOpened;

  const _NewConversationFab({
    required this.onConversationOpened,
  });

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton(
      backgroundColor: AppColors.primary,
      foregroundColor: AppColors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      onPressed: () => _showNewConversationDialog(context),
      child: const Icon(Icons.edit_outlined),
    );
  }

  void _showNewConversationDialog(BuildContext context) {
    final auth = context.read<AuthProvider>();
    final msgProvider = context.read<MessagesProvider>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _NewConversationSheet(
        users: msgProvider.users,
        currentUserId: auth.user?.id ?? 0,
        onCreateGroup: () async {
          Navigator.pop(ctx);
          await showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            builder: (_) => _CreateGroupSheet(
              users: msgProvider.users,
              currentUserId: auth.user?.id ?? 0,
              onCreate: (name, userIds) async {
                final conv = await msgProvider.createConversation(
                  type: 'group',
                  name: name.trim().isEmpty ? 'Group Chat' : name.trim(),
                  userIds: userIds,
                  companyId: auth.user?.companyId,
                );
                await msgProvider.loadConversations(
                    companyId: auth.user?.companyId);
                if (context.mounted) {
                  onConversationOpened(conv.id);
                }
              },
            ),
          );
        },
        onSelect: (user) async {
          Navigator.pop(ctx);
          try {
            final conv = await msgProvider.createConversation(
              type: 'dm',
              otherUserId: user.userId,
              companyId: auth.user?.companyId,
            );
            await msgProvider.loadConversations(
                companyId: auth.user?.companyId);
            onConversationOpened(conv.id);
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Failed to create conversation: $e'),
                  backgroundColor: AppColors.danger,
                ),
              );
            }
          }
        },
      ),
    );
  }
}

class _NewConversationSheet extends StatefulWidget {
  final List<Participant> users;
  final int currentUserId;
  final ValueChanged<Participant> onSelect;
  final Future<void> Function() onCreateGroup;

  const _NewConversationSheet({
    required this.users,
    required this.currentUserId,
    required this.onSelect,
    required this.onCreateGroup,
  });

  @override
  State<_NewConversationSheet> createState() => _NewConversationSheetState();
}

class _AddGroupMembersSheet extends StatefulWidget {
  final int conversationId;
  final int currentUserId;
  final int? companyId;
  final ScrollController scrollController;

  const _AddGroupMembersSheet({
    required this.conversationId,
    required this.currentUserId,
    required this.companyId,
    required this.scrollController,
  });

  @override
  State<_AddGroupMembersSheet> createState() => _AddGroupMembersSheetState();
}

class _AddGroupMembersSheetState extends State<_AddGroupMembersSheet> {
  String _filter = '';
  int? _addingId;

  Set<int> _memberUserIds(Conversation? conv) {
    final s = <int>{widget.currentUserId};
    if (conv != null) {
      for (final p in conv.participants) {
        s.add(p.userId);
      }
    }
    return s;
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MessagesProvider>(
      builder: (context, provider, _) {
        Conversation? conv;
        for (final c in provider.conversations) {
          if (c.id == widget.conversationId) {
            conv = c;
            break;
          }
        }
        final memberIds = _memberUserIds(conv);
        final q = _filter.trim().toLowerCase();
        final candidates = provider.users.where((u) {
          if (memberIds.contains(u.userId)) return false;
          if (q.isEmpty) return true;
          return u.name.toLowerCase().contains(q) ||
              (u.email?.toLowerCase().contains(q) ?? false) ||
              (u.role?.toLowerCase().contains(q) ?? false);
        }).toList();

        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 8),
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Add people',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Tap Add next to a teammate to include them in this group '
                  '(same as the web app).',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[700],
                    height: 1.35,
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Search people…',
                    prefixIcon: const Icon(Icons.search_rounded),
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                  onChanged: (v) => setState(() => _filter = v),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: candidates.isEmpty
                      ? const Center(
                          child: Text(
                            'Everyone is already in this group',
                            style: TextStyle(color: AppColors.textSecondary),
                            textAlign: TextAlign.center,
                          ),
                        )
                      : ListView.builder(
                          controller: widget.scrollController,
                          itemCount: candidates.length,
                          itemBuilder: (context, index) {
                            final user = candidates[index];
                            final busy = _addingId == user.userId;
                            return ListTile(
                              leading: _Avatar(name: user.name, size: 40),
                              title: Text(
                                user.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              subtitle: user.email != null
                                  ? Text(
                                      user.email!,
                                      style: const TextStyle(fontSize: 13),
                                    )
                                  : null,
                              trailing: busy
                                  ? const SizedBox(
                                      width: 28,
                                      height: 28,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: AppColors.primary,
                                      ),
                                    )
                                  : TextButton(
                                      onPressed: () async {
                                        setState(() => _addingId = user.userId);
                                        try {
                                          await provider.addGroupMembers(
                                            widget.conversationId,
                                            [user.userId],
                                            companyId: widget.companyId,
                                          );
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                              SnackBar(
                                                content: Text(
                                                    '${user.name} added'),
                                                backgroundColor:
                                                    AppColors.primary,
                                              ),
                                            );
                                          }
                                        } catch (e) {
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                              SnackBar(
                                                content: Text(
                                                    'Could not add: $e'),
                                                backgroundColor:
                                                    AppColors.danger,
                                              ),
                                            );
                                          }
                                        } finally {
                                          if (mounted) {
                                            setState(() => _addingId = null);
                                          }
                                        }
                                      },
                                      child: const Text('Add'),
                                    ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}



class _CreateGroupSheet extends StatefulWidget {
  final List<Participant> users;
  final int currentUserId;
  final Future<void> Function(String name, List<int> userIds) onCreate;

  const _CreateGroupSheet({
    required this.users,
    required this.currentUserId,
    required this.onCreate,
  });

  @override
  State<_CreateGroupSheet> createState() => _CreateGroupSheetState();
}

class _CreateGroupSheetState extends State<_CreateGroupSheet> {
  final _nameCtrl = TextEditingController();
  String _filter = '';
  final Set<int> _selected = <int>{};
  bool _creating = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final q = _filter.trim().toLowerCase();
    final candidates = widget.users
        .where((u) => u.userId != widget.currentUserId)
        .where((u) {
          if (q.isEmpty) return true;
          return u.name.toLowerCase().contains(q) ||
              (u.email?.toLowerCase().contains(q) ?? false);
        })
        .toList();

    return DraggableScrollableSheet(
      initialChildSize: 0.78,
      minChildSize: 0.45,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: [
              const SizedBox(height: 8),
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Create Group Chat',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _nameCtrl,
                decoration: InputDecoration(
                  hintText: 'Group name',
                  prefixIcon: const Icon(Icons.group_rounded),
                  filled: true,
                  fillColor: AppColors.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              TextField(
                decoration: InputDecoration(
                  hintText: 'Search people...',
                  prefixIcon: const Icon(Icons.search),
                  filled: true,
                  fillColor: AppColors.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
                onChanged: (v) => setState(() => _filter = v),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Selected: ${_selected.length}',
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 12,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.builder(
                  controller: scrollController,
                  itemCount: candidates.length,
                  itemBuilder: (context, index) {
                    final u = candidates[index];
                    final checked = _selected.contains(u.userId);
                    return CheckboxListTile(
                      value: checked,
                      onChanged: (_) {
                        setState(() {
                          if (checked) {
                            _selected.remove(u.userId);
                          } else {
                            _selected.add(u.userId);
                          }
                        });
                      },
                      title: Text(u.name),
                      subtitle: u.email != null ? Text(u.email!) : null,
                      controlAffinity: ListTileControlAffinity.leading,
                    );
                  },
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _creating || _selected.isEmpty
                      ? null
                      : () async {
                          setState(() => _creating = true);
                          try {
                            await widget.onCreate(
                              _nameCtrl.text,
                              _selected.toList(),
                            );
                            if (context.mounted) Navigator.pop(context);
                          } catch (e) {
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Failed to create group: $e'),
                                  backgroundColor: AppColors.danger,
                                ),
                              );
                            }
                          } finally {
                            if (mounted) setState(() => _creating = false);
                          }
                        },
                  child: _creating
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: AppColors.white,
                          ),
                        )
                      : const Text('Create Group'),
                ),
              ),
              SizedBox(height: 12 + MediaQuery.of(context).padding.bottom),
            ],
          ),
        ),
      ),
    );
  }
}

class _NewConversationSheetState extends State<_NewConversationSheet> {
  String _filter = '';

  @override
  Widget build(BuildContext context) {
    final filtered = widget.users
        .where((u) => u.userId != widget.currentUserId)
        .where(
            (u) => u.name.toLowerCase().contains(_filter.toLowerCase()))
        .toList();

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                const SizedBox(height: 8),
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'New Conversation',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => widget.onCreateGroup(),
                    icon: const Icon(Icons.group_add_rounded),
                    label: const Text('Create Group'),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  autofocus: true,
                  decoration: InputDecoration(
                    hintText: 'Search people...',
                    prefixIcon: const Icon(Icons.search),
                    filled: true,
                    fillColor: AppColors.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                  onChanged: (v) => setState(() => _filter = v),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(
                          child: Text(
                            'No users found',
                            style: TextStyle(color: AppColors.textSecondary),
                          ),
                        )
                      : ListView.builder(
                          controller: scrollController,
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final user = filtered[index];
                            return ListTile(
                              leading: _Avatar(name: user.name, size: 40),
                              title: Text(
                                user.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              subtitle: user.email != null
                                  ? Text(
                                      user.email!,
                                      style: const TextStyle(fontSize: 13),
                                    )
                                  : null,
                              onTap: () => widget.onSelect(user),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Shared avatar widget
// ---------------------------------------------------------------------------

class _Avatar extends StatelessWidget {
  final String name;
  final double size;

  const _Avatar({required this.name, this.size = 40});

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: _colorForName(name),
      child: Text(
        _initials(name),
        style: TextStyle(
          fontSize: size * 0.36,
          fontWeight: FontWeight.w700,
          color: AppColors.white,
        ),
      ),
    );
  }

  String _initials(String n) {
    final parts = n.trim().split(RegExp(r'\s+'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return n.isNotEmpty ? n[0].toUpperCase() : '?';
  }

  Color _colorForName(String n) {
    const palette = [
      AppColors.primary,
      AppColors.info,
      AppColors.secondary,
      Color(0xFF8E24AA),
      Color(0xFFE65100),
      Color(0xFF1565C0),
      Color(0xFF2E7D32),
      Color(0xFF6A1B9A),
    ];
    var hash = 0;
    for (final c in n.codeUnits) {
      hash = (hash * 31 + c) & 0x7FFFFFFF;
    }
    return palette[hash % palette.length];
  }
}
