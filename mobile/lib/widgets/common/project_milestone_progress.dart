import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../models/project.dart';

/// A horizontal milestone progress stepper that mirrors the web application's
/// ProjectMilestoneProgress component. Shows all project stages as dots
/// connected by lines, with completed stages highlighted in teal and
/// the current stage accented with a glow ring.
class ProjectMilestoneProgress extends StatelessWidget {
  final String currentStage;
  final List<Map<String, String>>? customStages;

  const ProjectMilestoneProgress({
    super.key,
    required this.currentStage,
    this.customStages,
  });

  @override
  Widget build(BuildContext context) {
    final stages = customStages ??
        Project.stages
            .map((key) => {'key': key, 'label': Project.stageLabels[key] ?? key})
            .toList();

    if (stages.isEmpty) return const SizedBox.shrink();

    final currentIndex =
        stages.indexWhere((s) => s['key'] == currentStage);
    final safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        child: SizedBox(
          width: stages.length * 100.0,
          child: LayoutBuilder(
            builder: (context, constraints) {
              return CustomPaint(
                painter: _MilestoneLinePainter(
                  stageCount: stages.length,
                  currentIndex: safeCurrentIndex,
                  totalWidth: constraints.maxWidth,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: List.generate(stages.length, (idx) {
                    final stage = stages[idx];
                    final isCompleted = idx < safeCurrentIndex;
                    final isCurrent = idx == safeCurrentIndex;
                    final isCancelled = stage['key'] == 'cancelled';
                    final isCurrentCancelled = isCurrent && isCancelled;

                    return SizedBox(
                      width: constraints.maxWidth / stages.length,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _buildDot(
                            isCompleted: isCompleted,
                            isCurrent: isCurrent,
                            isCancelled: isCurrentCancelled,
                          ),
                          const SizedBox(height: 10),
                          Text(
                            stage['label'] ?? stage['key'] ?? '',
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight:
                                  isCurrent ? FontWeight.w700 : FontWeight.w600,
                              color: isCurrentCancelled
                                  ? const Color(0xFF991B1B)
                                  : (isCompleted || isCurrent)
                                      ? AppColors.textPrimary
                                      : AppColors.textSecondary,
                              height: 1.25,
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ),
              );
            },
          ),
        ),
      ),
    );
  }

  Widget _buildDot({
    required bool isCompleted,
    required bool isCurrent,
    required bool isCancelled,
  }) {
    const tealColor = Color(0xFF0D9488);
    const dangerColor = Color(0xFFDC2626);

    final double size = isCurrent ? 22 : 18;
    final Color borderColor;
    final Color dotBg;

    if (isCancelled) {
      borderColor = dangerColor;
      dotBg = AppColors.white;
    } else if (isCompleted) {
      borderColor = tealColor;
      dotBg = tealColor;
    } else if (isCurrent) {
      borderColor = tealColor;
      dotBg = AppColors.white;
    } else {
      borderColor = const Color(0xFFCBD5E1);
      dotBg = AppColors.white;
    }

    return Container(
      width: size,
      height: size,
      margin: EdgeInsets.only(top: isCurrent ? 5 : 7),
      decoration: BoxDecoration(
        color: dotBg,
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: 3),
        boxShadow: isCurrent
            ? [
                BoxShadow(
                  color: isCancelled
                      ? dangerColor.withOpacity(0.15)
                      : tealColor.withOpacity(0.16),
                  blurRadius: 0,
                  spreadRadius: 4,
                ),
              ]
            : null,
      ),
      child: isCompleted
          ? const Center(
              child: Icon(Icons.check, size: 11, color: AppColors.white),
            )
          : isCancelled
              ? const Center(
                  child: Icon(Icons.close, size: 11, color: dangerColor),
                )
              : null,
    );
  }
}

/// Custom painter that draws the background line (gray) and progress
/// fill line (teal) connecting the milestone dots.
class _MilestoneLinePainter extends CustomPainter {
  final int stageCount;
  final int currentIndex;
  final double totalWidth;

  _MilestoneLinePainter({
    required this.stageCount,
    required this.currentIndex,
    required this.totalWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (stageCount < 2) return;

    final segmentWidth = totalWidth / stageCount;
    // The center x of each dot = (idx * segmentWidth) + (segmentWidth / 2)
    final firstCenterX = segmentWidth / 2;
    final lastCenterX = (stageCount - 1) * segmentWidth + segmentWidth / 2;

    // Vertical position aligned with dot center (top: 7 margin + 9 half of 18px dot)
    const lineY = 16.0;
    const lineHeight = 3.0;

    // Background track
    final bgPaint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeCap = StrokeCap.round;

    canvas.drawRRect(
      RRect.fromLTRBR(
        firstCenterX,
        lineY - lineHeight / 2,
        lastCenterX,
        lineY + lineHeight / 2,
        const Radius.circular(999),
      ),
      bgPaint,
    );

    // Progress fill
    if (currentIndex > 0) {
      final progressEndX =
          currentIndex * segmentWidth + segmentWidth / 2;

      final progressPaint = Paint()
        ..color = const Color(0xFF0D9488)
        ..strokeCap = StrokeCap.round;

      canvas.drawRRect(
        RRect.fromLTRBR(
          firstCenterX,
          lineY - lineHeight / 2,
          progressEndX,
          lineY + lineHeight / 2,
          const Radius.circular(999),
        ),
        progressPaint,
      );
    }
  }

  @override
  bool shouldRepaint(_MilestoneLinePainter oldDelegate) =>
      oldDelegate.currentIndex != currentIndex ||
      oldDelegate.stageCount != stageCount ||
      oldDelegate.totalWidth != totalWidth;
}
