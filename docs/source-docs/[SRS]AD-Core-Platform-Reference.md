# [SRS 문서] AD-Core-Platform (한글)

# 소프트웨어 요구사항 명세서 (SRS)

**문서 ID:** SRS-ADTECH-MVP-001

**개정 버전:** 1.0

**날짜:** 2025-06-13

**표준:** ISO/IEC/IEEE 29148:2018

---

## 1. 서론

### 1.1 목적

본 문서는 ISO/IEC/IEEE 29148:2018 표준에 따라, **MECE 원칙을 준수하는 오디언스 세분화 기능을 갖춘 마이크로서비스 기반 프로그래매틱 광고 플랫폼**의 요구사항을 정의한다.

### 1.2 범위

- 복합 분류를 활용한 MECE 기반 **인구통계 세분화 (연령, 소득, 지역)**
- **멀티 태그 행동 프로파일링** (구매 의도, 참여도, 디바이스 선호)
- 타게팅 조건 설정을 포함한 **캠페인 관리**
- 입찰 기반 최적화를 포함한 3단계 폴백 광고 제공
- 실시간 성과 로깅 및 어트리뷰션
- 데이터 영속성을 위한 소프트 삭제 전략
- 프로그래매틱 타게팅을 위한 웹/모바일 분리 API 연동

### 1.3 정의, 약어, 축약어

| 용어 | 정의 |
| --- | --- |
| MSA | 마이크로서비스 아키텍처 |
| MECE | 상호 배타적이고 전체를 포괄하는 원칙 |
| Demographic Segment | 연령, 소득, 지역으로 구성된 복합 세그먼트 (예: "AGE_25_34_MID_URBAN") |
| Purchase Intent | 특정 카테고리에서 구매 가능성을 나타내는 예측 신호 |
| Multi-Tag | 서로 다른 카테고리에 걸쳐 사용자에게 부여되는 복수의 행동 태그 |
| Three-Stage Fallback | 정밀 타게팅 → 인구통계만 적용 → 기본 광고 순서 |
| Soft-delete | 논리 삭제 (데이터는 데이터베이스에 남아 있음) |
| E2E Response Time | 종단 간 요청 처리 시간 |
| CTR | 클릭률 - 성과 지표 (클릭수/노출수) |
| eCPM | 유효 CPM - 1000회 노출당 수익 |
| Fill Rate | 광고 요청 중 실제 광고가 채워진 비율 |

---

## 2. 이해관계자

| 역할 | 이름 / 부서 | 책임 |
| --- | --- | --- |
| 기획 매니저 (PM) | 기획팀 | 요구사항 수집 및 우선순위 결정 |
| 기획 분석가 (IT) | 기획팀 | 상세 요구사항 문서화 |
| 개발팀 리드 | 백엔드 팀 리드 | 설계 검토 및 승인 |
| 개발 엔지니어 | 백엔드 개발자 | 구현 및 단위 테스트 |
| 시스템 운영자 | 운영팀 | 배포 및 모니터링 |
| 서비스 운영자 | 운영팀 | 운영 서비스 운영 및 예외 처리 |
| 사업관리 및 계약 담당자 | 사업팀 | 계약 조건 및 SLA 관리 |
| CRM 매니저 | 마케팅팀 | 세그먼트 정의 및 태그 기준 검증 |

---

## 3. 시스템 맥락 및 인터페이스

- **클라이언트 애플리케이션**
    1. 모바일 웹 앱 `https://api.adtech.example.com/mobile`
    2. 데스크톱 웹 앱 `https://api.adtech.example.com/desktop`
- **내부 마이크로서비스**
    - Audience Service : MECE 인구통계 세분화 및 행동 신호 관리
    - Campaign Service : 캠페인 CRUD 및 타게팅 조건 설정
    - Ad Serving Engine : 수익 최적화를 포함한 3단계 폴백 추천
    - Tracking Service : 이벤트 수집 및 성과 어트리뷰션
- **외부 시스템**
    - User Profile Service
    - Advertiser Portal
    - Logging & Performance Dashboard System

---

## 4. 구체적 요구사항

### 4.1 기능 요구사항

| ID | 제목 | 출처 | 우선순위 | 유형 | 검증 방식 | 인수 기준 | 상태 | 담당자 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **REQ-FUNC-001** | MECE 인구통계 세그먼트 분류 | 아키텍처 설계 문서 3.1 | Must Have | Functional | 1) MECE 준수 테스트<br>2) 차원 커버리지 검증<br>3) QA 검증 | 사용자는 연령, 소득, 지역 차원으로부터 정확히 하나의 복합 세그먼트에 할당되어야 한다. 형식: "AGE_XX_INCOME_XX_GEOGRAPHY_XX" | Proposed | 개발 엔지니어 |
| **REQ-FUNC-002** | 멀티 태그 구매 의도 및 행동 분류 | 설계 문서 3.2 | Must Have | Functional | 1) 태그 할당 테스트<br>2) 다중 카테고리 검증<br>3) QA 검증 | 사용자는 구매 의도, 참여 행동, 디바이스 선호 카테고리 전반에 걸쳐 복수의 태그를 부여받아야 한다 | Proposed | 기획 분석가 (IT) |
| **REQ-FUNC-003** | 캠페인 관리 및 타게팅 설정 | 설계 문서 4.1 | Must Have | Functional | 1) 캠페인 CRUD 테스트<br>2) 타게팅 로직 검증<br>3) QA 검증 | 캠페인 생성, 타게팅 조건 설정, 예산 관리를 지원해야 한다 | Proposed | 개발팀 리드 |
| **REQ-FUNC-004** | 3단계 폴백 광고 로직 | 설계 문서 5.1 | Must Have | Functional | 1) 폴백 순서 테스트<br>2) 단계 검증<br>3) QA 검증 | 1단계: 정밀 타게팅 (인구통계+행동)  2단계: 인구통계만 적용  3단계: 컨텍스트/기본 광고 | Proposed | 개발 엔지니어 |
| **REQ-FUNC-005** | 수익 최적화 및 캠페인 선택 | 설계 문서 5.2 | Must Have | Functional | 1) 입찰 최적화 테스트<br>2) 수익 검증<br>3) QA 검증 | 타게팅 조건 내에서 가장 높은 입찰가를 선택하고, 예산 제약을 준수해야 한다 | Proposed | 개발 엔지니어 |
| **REQ-FUNC-006** | 노출 위치별 광고 슬롯 제어 | 설계 문서 4.2 | Should Have | Functional | 1) 위치 기반 테스트<br>2) 슬롯 수 검증<br>3) QA 검증 | 각 위치(MAIN_TOP, MAIN_MIDDLE 등)에 정의된 슬롯 수에 따라 광고를 노출해야 한다 | Proposed | 서비스 운영자 |
| **REQ-FUNC-007** | 소프트 삭제 구현 및 이력 보존 | 설계 문서 6.2 | Should Have | Functional | 1) 삭제 로직 테스트<br>2) 데이터 무결성 검증<br>3) QA 검증 | 삭제 API 호출은 데이터 무결성과 이력을 유지하면서 deleted_at 필드만 갱신해야 한다 | Proposed | 시스템 운영자 |
| **REQ-FUNC-008** | 성과 지표 기록 및 어트리뷰션 | 설계 문서 7.1 | Must Have | Functional | 1) 지표 정확성 테스트<br>2) 어트리뷰션 검증<br>3) QA 검증 | 인구통계 세그먼트 및 행동 태그 기준으로 CTR, CPC, eCPM을 실시간 기록해야 한다 | Proposed | CRM 매니저 |

### 4.2 비기능 요구사항

| ID | 제목 | 출처 | 우선순위 | 유형 | 검증 방식 | 인수 기준 | 상태 | 담당자 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **REQ-NF-001** | 종단 간 응답 시간  100ms | 업계 가이드라인 | Must Have | Performance | 차원 쿼리를 포함한 부하 테스트 프로그램 | 모바일/데스크톱 API의 E2E 응답 시간이 차원 조회를 포함하여 95% 시나리오에서 100ms 이하여야 한다 | Proposed | 시스템 운영자 |
| **REQ-NF-002** | 처리량 확장성: 1,000 RPS 지원 | 업계 가이드라인 | Should Have | Scalability | 다중 서비스 아키텍처 기반 부하 테스트 프로그램 | 서비스 간 수직/수평 확장을 통해 1k+ RPS를 처리할 수 있어야 한다 | Proposed | 개발팀 리드 |
| **REQ-NF-003** | 가용성  99% | 업계 가이드라인 | Must Have | Reliability | 마이크로서비스 전반의 모니터링 및 SLA 검증 | 연간 다운타임은 3.65일 이하여야 하며, 서비스 수준 이중화가 적용되어야 한다 | Proposed | 사업관리 및 계약 담당자 |
| **REQ-NF-004** | 기본 인증 및 인가 | 보안 정책 | Must Have | Security | 보안 감사 및 접근 제어 테스트 | 모든 API에 기본 인증이 요구되어야 하며, 비인가 접근은 차단되어야 한다 | Proposed | 개발팀 리드 |
| **REQ-NF-005** | 유지보수성: Enum 확장 방식 | 아키텍처 설계 문서 8.2 | Could Have | Maintainability | 코드 리뷰 및 확장성 테스트 | 새로운 세그먼트/태그/위치를 추가할 때 enum 패턴을 통해 코드 변경을 최소화해야 한다 | Proposed | 개발 엔지니어 |

---

## 5. 추적성 매트릭스

| 요구사항 ID | 모듈 | 구현 클래스 | 테스트 케이스 ID |
| --- | --- | --- | --- |
| REQ-FUNC-001 | Audience Service | DemographicSegmentClassifier | TC-FUNC-001 |
| REQ-FUNC-002 | Audience Service | BehavioralSignalProcessor | TC-FUNC-002 |
| REQ-FUNC-003 | Campaign Service | CampaignManager | TC-FUNC-003 |
| REQ-FUNC-004 | Ad Serving Engine | ThreeStageRecommendationEngine | TC-FUNC-004 |
| REQ-FUNC-005 | Ad Serving Engine | YieldOptimizer | TC-FUNC-005 |
| REQ-FUNC-006 | Ad Serving Engine | PositionBasedAdSelector | TC-FUNC-006 |
| REQ-FUNC-007 | All Services | SoftDeleteService | TC-FUNC-007 |
| REQ-FUNC-008 | Tracking Service | PerformanceTracker | TC-FUNC-008 |
| REQ-NF-001 | API Gateway | PerformanceMonitor | TC-NF-001 |

---

## 6. 부록

### 6.1 API 엔드포인트 목록

| 서비스 유형 | 메서드 | 엔드포인트 | 설명 |
| --- | --- | --- | --- |
| **Audience Service** | GET | `/api/v1/audience/profiles/{userId}` | 사용자 인구통계 및 행동 프로파일 조회 |
| **Audience Service** | POST | `/api/v1/audience/profiles/{userId}/segments` | 사용자 인구통계 세그먼트 갱신 |
| **Audience Service** | POST | `/api/v1/audience/profiles/{userId}/behavioral-signals` | 사용자 프로파일에 행동 신호 추가 |
| **Campaign Service** | POST | `/api/v1/campaigns` | 신규 광고 캠페인 생성 |
| **Campaign Service** | PUT | `/api/v1/campaigns/{campaignId}/targeting` | 캠페인 타게팅 조건 갱신 |
| **Campaign Service** | GET | `/api/v1/campaigns/{campaignId}/performance` | 캠페인 성과 지표 조회 |
| **Ad Serving Engine** | POST | `/api/v1/ads/request` | 3단계 폴백을 포함한 광고 요청 |
| **Ad Serving Engine** | POST | `/api/v1/ads/events/click` | 광고 클릭 이벤트 추적 |
| **Tracking Service** | POST | `/api/v1/tracking/events` | 대용량 추적을 위한 이벤트 일괄 수집 |
| **Tracking Service** | GET | `/api/v1/tracking/campaigns/{campaignId}/metrics` | 실시간 캠페인 성과 지표 |

### 6.2 데이터 모델 정의

```java
// MECE 인구통계 세분화 (총 36개 조합)
public enum AgeSegment {
    AGE_18_24("청년층", 18, 24),
    AGE_25_34("젊은 직장인층", 25, 34),
    AGE_35_44("안정기 성인층", 35, 44),
    AGE_45_PLUS("중장년층", 45, 120);
}

public enum IncomeSegment {
    LOW("저소득", 0, 50000),
    MID("중간소득", 50001, 100000),
    HIGH("고소득", 100001, Integer.MAX_VALUE);
}

public enum GeographySegment {
    URBAN("도시 지역"),
    SUBURBAN("교외 지역"),
    RURAL("농어촌 지역");
}

// 행동 신호 분류
public enum PurchaseIntent {
    AUTOMOTIVE("자동차", "자동차 조사 및 구매 신호"),
    FINANCE("금융 서비스", "은행, 투자, 보험 관심"),
    TRAVEL("여행 및 관광", "여행 계획 및 예약 행동"),
    RETAIL("리테일 및 전자상거래", "온라인 쇼핑 패턴"),
    TECHNOLOGY("기술", "기술 제품 조사 및 도입"),
    HEALTHCARE("헬스케어", "건강 및 웰니스 관심"),
    REAL_ESTATE("부동산", "부동산 탐색 및 투자");
}

public enum EngagementBehavior {
    HIGH_FREQUENCY("고빈도", "일일 활성 사용자"),
    MODERATE_FREQUENCY("중간 빈도", "주간 활성 사용자"),
    LOW_FREQUENCY("저빈도", "월간 활성 사용자"),
    RESEARCH_ORIENTED("탐색 지향", "심층 콘텐츠 소비"),
    IMPULSE_DRIVEN("충동 지향", "빠른 의사결정 패턴");
}

public enum DevicePreference {
    MOBILE_FIRST("모바일 우선", "주요 모바일 디바이스 사용"),
    DESKTOP_PREFERRED("데스크톱 선호", "주요 데스크톱 사용"),
    MULTI_DEVICE("멀티 디바이스", "크로스 디바이스 사용 패턴"),
    TABLET_FOCUSED("태블릿 중심", "주요 태블릿 사용");
}

// 캠페인 타게팅 설정
public enum BiddingStrategy {
    CPC("클릭당 비용"),
    CPM("1,000회 노출당 비용"),
    CPA("전환당 비용");
}

public enum CampaignStatus {
    DRAFT("초안"),
    ACTIVE("활성"),
    PAUSED("일시중지"),
    COMPLETED("완료");
}

// 광고 노출 위치
public enum AdPosition {
    MAIN_TOP("메인 상단 배너"),
    MAIN_MIDDLE("메인 중단 영역"),
    MAIN_BOTTOM("메인 하단 배너"),
    MAIN_LEFT_SIDEBAR("좌측 사이드바"),
    MAIN_RIGHT_SIDEBAR("우측 사이드바");
}

// 이벤트 추적
public enum EventType {
    IMPRESSION("광고 노출"),
    CLICK("광고 클릭"),
    CONVERSION("광고 전환");
}

// 성과 분석용 폴백 단계
public enum FallbackStage {
    STAGE_PRECISE(1, "정밀 타게팅", "인구통계 + 행동 신호"),
    STAGE_DEMOGRAPHIC(2, "인구통계만 적용", "인구통계만 적용"),
    STAGE_CONTEXTUAL(3, "컨텍스트/기본", "위치 기반 기본 광고");

    private final int stageNumber;
    private final String stageName;
    private final String description;
}
```

### 6.3 `비즈니스` 규칙 요약

1. **MECE 준수**: 각 사용자는 각 차원(연령, 소득, 지역)에 대해 정확히 하나의 값을 가져야 한다
2. **멀티 태그 할당**: 사용자는 서로 다른 행동 카테고리에 걸쳐 복수의 태그를 가질 수 있다
3. **폴백 순서**: 최대 Fill Rate를 위해 항상 1단계 → 2단계 → 3단계 순서로 시도해야 한다
4. **수익 최적화**: 타게팅 조건과 예산 제약 내에서 가장 높은 입찰가를 선택해야 한다
5. **소프트 삭제**: 물리 삭제를 수행하지 않고 항상 deleted_at 타임스탬프를 사용해야 한다
6. **어트리뷰션 모델**: MVP에서는 Last-click Attribution을 적용하며, 향후 Multi-touch 모델로 확장 가능해야 한다
7. **예산 관리**: 일일 예산 상한을 적용하고, 예산 소진 시 캠페인을 자동 일시중지해야 한다
8. **성과 추적**: 5분 단위 갱신 주기로 실시간 지표를 집계해야 한다

### 6.4 데이터베이스 스키마 개요

```sql
-- 핵심 테이블 요약
user_profiles              -- MECE 인구통계 세분화
user_behavioral_signals    -- 멀티 태그 행동 분류
campaigns                  -- 캠페인 설정 및 예산
campaign_targeting         -- 타게팅 조건 (비정규화)
campaign_creatives         -- 크리에이티브 자산 및 성과
ad_events                  -- 대용량 이벤트 추적 (파티셔닝)
campaign_performance_realtime -- 실시간 대시보드용 구체화 뷰
```

---

## 7. 향후 개선 사항

현재 MVP 설계는 결정론적 광고 제공과 단순화된 타게팅에 초점을 두고 있다. 다음 개선 사항은 향후 버전에서 계획된다.

### 7.1 RTB 및 OpenRTB 연동

- 노출 단위 경매를 위한 Real-Time Bidding (RTB) 구현
- 외부 DSP/SSP와의 입찰 통신을 위해 OpenRTB 프로토콜 채택
- Ad Serving Engine을 확장하여 입찰 요청/응답 및 예산 페이싱을 지원

### 7.2 동적 태깅 시스템

- 이벤트 기반 태그 할당 파이프라인 도입
- 사용자 프로파일 데이터베이스 내 태그의 효율적 저장 및 관리
- 적응형 타게팅을 위한 규칙 기반 및 ML 기반 태그 생성 지원

### 7.3 고급 타게팅 전략

- **컨텍스트 타게팅**: 현재 페이지/카테고리 맥락에 따라 광고 매칭
- **행동 타게팅**: 과거 사용자 행동(예: 구매, 페이지 조회)을 기반으로 타게팅
- **리타게팅**: 쿠키/사용자 ID를 활용한 크로스 사이트 사용자 식별
- **인구통계 타게팅**: 연령, 성별, 소득 기반 세분화 확장
- **기타 기준**: 위치 정보, 디바이스/브라우저 유형, 요일/시간대 기반 노출

이들 기능은 시스템을 현대적인 AdTech 플랫폼에 더욱 가깝게 정렬시키고, 수익화 기회를 확장할 것이다.

---

*작성자: 기획 분석가 (IT), 검토자: 개발팀 리드, 승인자: 기획 매니저 (PM)*
