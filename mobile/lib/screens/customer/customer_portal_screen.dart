import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../widgets/common/empty_state.dart';

class CustomerPortalScreen extends StatefulWidget {
  const CustomerPortalScreen({super.key});

  @override
  State<CustomerPortalScreen> createState() => _CustomerPortalScreenState();
}

class _CustomerPortalScreenState extends State<CustomerPortalScreen> {
  int _currentIndex = 0;

  static const _tabs = [
    _TabConfig('My Project', Icons.solar_power_outlined),
    _TabConfig('Referrals', Icons.people_outline),
    _TabConfig('Support', Icons.support_agent_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer Portal'),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.white,
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          _MyProjectTab(),
          _ReferralsTab(),
          _SupportTab(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (i) => setState(() => _currentIndex = i),
        indicatorColor: AppColors.primary.withOpacity(0.12),
        destinations: _tabs
            .map((t) => NavigationDestination(
                  icon: Icon(t.icon),
                  selectedIcon: Icon(t.icon, color: AppColors.primary),
                  label: t.label,
                ))
            .toList(),
      ),
    );
  }
}

class _TabConfig {
  final String label;
  final IconData icon;
  const _TabConfig(this.label, this.icon);
}

class _MyProjectTab extends StatelessWidget {
  const _MyProjectTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildProgressCard(context),
        const SizedBox(height: 16),
        _buildInfoSection(context),
      ],
    );
  }

  Widget _buildProgressCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, Color(0xFF2A9D8F)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.solar_power, color: AppColors.white, size: 28),
              SizedBox(width: 10),
              Text(
                'My Solar Project',
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: 0.65,
              minHeight: 10,
              backgroundColor: AppColors.white.withOpacity(0.2),
              valueColor:
                  const AlwaysStoppedAnimation<Color>(AppColors.white),
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            '65% Complete',
            style: TextStyle(
              color: AppColors.white,
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Installation in progress',
            style: TextStyle(
              color: AppColors.white.withOpacity(0.8),
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoSection(BuildContext context) {
    final milestones = [
      _Milestone('Design Approved', true),
      _Milestone('Permits Obtained', true),
      _Milestone('Installation', false),
      _Milestone('Inspection', false),
      _Milestone('Activation', false),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Project Milestones',
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 16,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 14),
          ...milestones.map((m) => Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: m.done
                            ? AppColors.success.withOpacity(0.12)
                            : AppColors.surface,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: m.done
                              ? AppColors.success
                              : AppColors.disabled,
                          width: 2,
                        ),
                      ),
                      child: m.done
                          ? const Icon(Icons.check,
                              size: 16, color: AppColors.success)
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      m.label,
                      style: TextStyle(
                        fontSize: 14,
                        color: m.done
                            ? AppColors.textPrimary
                            : AppColors.textSecondary,
                        fontWeight:
                            m.done ? FontWeight.w500 : FontWeight.normal,
                        decoration:
                            m.done ? TextDecoration.lineThrough : null,
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

class _Milestone {
  final String label;
  final bool done;
  const _Milestone(this.label, this.done);
}

class _ReferralsTab extends StatelessWidget {
  const _ReferralsTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.primary.withOpacity(0.06),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.primary.withOpacity(0.15)),
          ),
          child: const Column(
            children: [
              Icon(Icons.card_giftcard,
                  size: 48, color: AppColors.primary),
              SizedBox(height: 12),
              Text(
                'Refer & Earn',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
              SizedBox(height: 6),
              Text(
                'Know someone interested in solar? Refer them and earn a bonus when they sign up!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const EmptyState(
          icon: Icons.people_outline,
          title: 'No Referrals Yet',
          subtitle: 'Your referral history will appear here.',
        ),
      ],
    );
  }
}

class _SupportTab extends StatelessWidget {
  const _SupportTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              const Icon(Icons.support_agent,
                  size: 48, color: AppColors.primary),
              const SizedBox(height: 12),
              const Text(
                'Need Help?',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Create a support ticket and our team will get back to you.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                          content: Text('Create ticket coming soon')),
                    );
                  },
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Create Ticket'),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const EmptyState(
          icon: Icons.confirmation_number_outlined,
          title: 'No Support Tickets',
          subtitle: 'Your support tickets will appear here.',
        ),
      ],
    );
  }
}
