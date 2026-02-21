--
-- PostgreSQL database dump
--

\restrict K1pjMaNwdq8eHJNrVf62e9X9aQ5KsDammdMAlugjAWJ6re3rvMjhld3WRmMWvlj

-- Dumped from database version 15.16
-- Dumped by pg_dump version 15.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_keys (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    key_hash character varying(255) NOT NULL,
    name character varying(100) DEFAULT 'Default'::character varying,
    is_active boolean DEFAULT true,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone,
    allowed_model character varying
);


ALTER TABLE public.api_keys OWNER TO postgres;

--
-- Name: balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.balances (
    user_id uuid NOT NULL,
    balance_usd numeric(12,6) DEFAULT 0.00 NOT NULL,
    lifetime_spent numeric(12,6) DEFAULT 0.00 NOT NULL,
    lifetime_earned numeric(12,6) DEFAULT 0.00 NOT NULL,
    last_deposit_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    lifetime_savings numeric(12,6) DEFAULT 0
);


ALTER TABLE public.balances OWNER TO postgres;

--
-- Name: deposits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deposits (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount_usd numeric(12,6) NOT NULL,
    amount_original numeric(12,6),
    currency character varying(10) DEFAULT 'USD'::character varying,
    payment_method character varying(50) NOT NULL,
    payment_provider character varying(50),
    provider_transaction_id character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    metadata json DEFAULT '{}'::json,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.deposits OWNER TO postgres;

--
-- Name: investor_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.investor_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    api_key_encrypted text NOT NULL,
    openrouter_account_id character varying(255),
    initial_balance numeric(12,2) NOT NULL,
    current_balance numeric(12,2) DEFAULT 0.00,
    min_threshold numeric(12,2) DEFAULT 50.00,
    commission_rate numeric(5,2) DEFAULT 1.00,
    total_earned numeric(12,2) DEFAULT 0.00,
    total_spent numeric(12,2) DEFAULT 0.00,
    status character varying(20) DEFAULT 'active'::character varying,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    revoked_at timestamp with time zone
);


ALTER TABLE public.investor_accounts OWNER TO postgres;

--
-- Name: investor_payouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.investor_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    investor_account_id uuid NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    amount_spent numeric(12,2) DEFAULT 0.00,
    commission_amount numeric(12,2) DEFAULT 0.00,
    status character varying(20) DEFAULT 'pending'::character varying,
    paid_at timestamp with time zone,
    transaction_id character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.investor_payouts OWNER TO postgres;

--
-- Name: investor_referral_earnings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.investor_referral_earnings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    investor_id uuid NOT NULL,
    referral_id uuid NOT NULL,
    request_log_id uuid,
    amount_usd numeric(12,6) DEFAULT 0 NOT NULL,
    turnover_usd numeric(12,6) DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying,
    paid_at timestamp without time zone
);


ALTER TABLE public.investor_referral_earnings OWNER TO postgres;

--
-- Name: investor_request_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.investor_request_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    investor_account_id uuid NOT NULL,
    model character varying(100) NOT NULL,
    prompt_tokens integer DEFAULT 0,
    completion_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    cost_usd numeric(12,6) DEFAULT 0.00,
    commission_usd numeric(12,6) DEFAULT 0.00,
    status character varying(20) DEFAULT 'success'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.investor_request_logs OWNER TO postgres;

--
-- Name: master_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.master_accounts (
    id uuid NOT NULL,
    name character varying(100) NOT NULL,
    api_key_encrypted text NOT NULL,
    balance_usd numeric(12,6) DEFAULT 0.00 NOT NULL,
    discount_percent integer DEFAULT 70 NOT NULL,
    monthly_limit_usd numeric(12,2),
    monthly_used_usd numeric(12,2) DEFAULT 0.00,
    current_month character varying(7) DEFAULT to_char((CURRENT_DATE)::timestamp with time zone, 'YYYY-MM'::text),
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    last_check_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    account_type character varying DEFAULT 'openrouter'::character varying,
    markup_percent numeric(5,2) DEFAULT 0,
    cost_basis numeric(12,6) DEFAULT 0,
    usage_weight integer DEFAULT 1
);


ALTER TABLE public.master_accounts OWNER TO postgres;

--
-- Name: model_pricing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.model_pricing (
    id character varying(100) NOT NULL,
    provider character varying(50) NOT NULL,
    display_name character varying(255),
    prompt_price numeric(12,9) NOT NULL,
    completion_price numeric(12,9) NOT NULL,
    context_length integer,
    is_active boolean DEFAULT true,
    fetched_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.model_pricing OWNER TO postgres;

--
-- Name: referral_clicks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_clicks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_code character varying(20) NOT NULL,
    clicked_by_ip character varying(45),
    clicked_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    converted boolean DEFAULT false,
    converted_user_id uuid
);


ALTER TABLE public.referral_clicks OWNER TO postgres;

--
-- Name: request_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.request_logs (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    api_key_id uuid,
    master_account_id uuid,
    model character varying(100) NOT NULL,
    endpoint character varying(100) NOT NULL,
    method character varying(10) DEFAULT 'POST'::character varying,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    cost_to_us_usd numeric(12,6) DEFAULT 0.00 NOT NULL,
    cost_to_client_usd numeric(12,6) DEFAULT 0.00 NOT NULL,
    profit_usd numeric(12,6) DEFAULT 0.00 NOT NULL,
    duration_ms integer,
    status_code integer,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    openrouter_cost_usd numeric(12,6),
    account_type_used character varying
);


ALTER TABLE public.request_logs OWNER TO postgres;

--
-- Name: support_operators; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_operators (
    telegram_id bigint NOT NULL,
    username character varying(100),
    name character varying(100),
    is_active boolean DEFAULT true,
    notify_on_priority text[] DEFAULT ARRAY['high'::text, 'critical'::text],
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.support_operators OWNER TO postgres;

--
-- Name: support_ticket_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_ticket_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid,
    author_type character varying(20) DEFAULT 'client'::character varying,
    author_id character varying(100),
    author_username character varying(100),
    message text NOT NULL,
    is_internal boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.support_ticket_comments OWNER TO postgres;

--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    telegram_id bigint NOT NULL,
    telegram_username character varying(100),
    category character varying(50) DEFAULT 'other'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'open'::character varying,
    title character varying(255),
    description text,
    api_key_id uuid,
    related_request_id uuid,
    screenshots jsonb DEFAULT '[]'::jsonb,
    assigned_to character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone
);


ALTER TABLE public.support_tickets OWNER TO postgres;

--
-- Name: telegram_bindings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telegram_bindings (
    telegram_id bigint NOT NULL,
    user_id uuid,
    username character varying(100),
    api_key_hash character varying(64),
    created_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone
);


ALTER TABLE public.telegram_bindings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255),
    role character varying(20) DEFAULT 'client'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    email_verified boolean DEFAULT false,
    email_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    force_password_change boolean DEFAULT false,
    referrer_id uuid,
    referral_code character varying(20),
    referral_bonus_claimed boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.alembic_version (version_num) FROM stdin;
001_initial
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_keys (id, user_id, key_hash, name, is_active, last_used_at, created_at, expires_at, allowed_model) FROM stdin;
be63d59c-a9b4-4070-8a85-a34bed61f79b	ca294741-3b10-4953-a3cf-43c1faaba9c0	026e02290168cf29fa2b332c490bc4a239477a11ce2023abeda3a91055ec7193	test1	t	\N	2026-02-18 06:18:45.772836+00	\N	qwen/qwen3.5-397b-a17b
a19ec9d3-3218-4292-b3c0-4a581d2c2425	ca294741-3b10-4953-a3cf-43c1faaba9c0	615bbf3d7e7b4a6d111f0219492314e6706367600950cbb5da343273dfb99d17	Auto: openai/sora-2	t	\N	2026-02-18 08:50:27.540187+00	\N	openai/sora-2
ed5a4f13-7bb8-42df-9722-e4a0d902f465	a94e6941-4159-426f-9172-12c10c9a1a61	b287446813770539778a7ee180023870b0b37c1cbdc929e7774aa103f3386a4e	Auto: openai/sora-2	t	\N	2026-02-18 08:50:38.114789+00	\N	openai/sora-2
4c416fe7-4faa-481a-ab4e-60cf360a64cf	ca294741-3b10-4953-a3cf-43c1faaba9c0	28566c2d9841c167e7d4e74b8eba9ef9bd54eae83f2ab59082b31aeaff603a00	Test Key	t	\N	2026-02-18 10:26:32.304777+00	\N	gpt-4o-mini
02d8ad39-dfad-4679-bcfc-d121d20504b4	d3589c53-534e-4040-be5f-0359515b4287	d0cf56d0ed4fd7f53b2d9e7af6d2340cd14546a1bd207c17b3a7941ef4d8dfad	New Key	t	\N	2026-02-18 17:43:17.646457+00	\N	bytedance-seed/seed-1.6
d64d63d0-4c84-4a2f-b60c-6624500a0160	d3589c53-534e-4040-be5f-0359515b4287	952004196fab686a1c0294d86e0fe0ee22fcd76d6de5a1f805cc4d82c6a034dd	Auto: openai/gpt-4o	t	\N	2026-02-18 17:44:42.582957+00	\N	openai/gpt-4o
ede7815d-2192-4d09-9b76-fcfd635210ae	ca294741-3b10-4953-a3cf-43c1faaba9c0	2f06febb29a84219c29f75e36ca633aba3b06ca32d7b63c105fb4db3cf9b02cc	Aibox 	t	\N	2026-02-20 11:11:40.39544+00	\N	\N
9df673df-8726-4b9b-aeda-3ff167fa0967	ca294741-3b10-4953-a3cf-43c1faaba9c0	f2a8b9c56662d56ff2afaa13c94273465c0696ddb1cbd2f349670f11a97ad69d	Test Key Generated	t	\N	2026-02-21 05:04:46.807844+00	\N	\N
348a18fb-f32d-4a57-afc5-399ba8901dd2	ca294741-3b10-4953-a3cf-43c1faaba9c0	8ae3a854fc0b1d1c00c94d82979709ea41e49ab044c82e5522f28fb64f73648f	supp	t	\N	2026-02-21 07:29:03.324047+00	\N	\N
1dc4fbb7-d3d8-4ebb-b391-ae6102dc753d	ca294741-3b10-4953-a3cf-43c1faaba9c0	690bb1fa1417fa0465443ce963d88c67165fa8998eb70bfd5374be3b1d6bc56e	Support Bot Test	t	\N	2026-02-21 07:33:20.068758+00	\N	\N
15c46e6c-d52c-4fe3-8193-6afe44c40629	ca294741-3b10-4953-a3cf-43c1faaba9c0	bd57c1eb5db139b19fae2c5fb9a1939bc8babcb3eafd8dbdb5cc8042dc8625a3	New Key	t	\N	2026-02-21 08:01:54.166446+00	\N	\N
\.


--
-- Data for Name: balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.balances (user_id, balance_usd, lifetime_spent, lifetime_earned, last_deposit_at, updated_at, lifetime_savings) FROM stdin;
4e2a25eb-9d39-4838-aee2-8003cd3126f3	1000.000000	0.000000	1000.000000	\N	2026-02-13 12:24:35.501626+00	0.000000
1978b659-c31f-49eb-ae97-2509a5ecc08c	100.000000	0.000000	100.000000	\N	2026-02-13 12:24:41.665165+00	0.000000
0d3714b7-3d9d-4426-a50b-b219f6439885	0.000000	0.000000	0.000000	\N	2026-02-18 04:50:52.765593+00	0.000000
a94e6941-4159-426f-9172-12c10c9a1a61	3.910000	0.000000	0.000000	2026-02-18 08:57:07.485218+00	2026-02-18 08:57:07.486529+00	0.000000
d3589c53-534e-4040-be5f-0359515b4287	0.000000	0.000000	0.000000	\N	2026-02-18 17:40:56.413588+00	0.000000
0f972f6b-8682-4037-a628-2eae88fc1d41	0.000000	0.000000	0.000000	\N	2026-02-20 08:39:06.991977+00	0.000000
ca294741-3b10-4953-a3cf-43c1faaba9c0	10.369955	0.745957	3.240000	2026-02-18 08:52:21.74543+00	2026-02-21 08:47:15.560433+00	0.180988
\.


--
-- Data for Name: deposits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deposits (id, user_id, amount_usd, amount_original, currency, payment_method, payment_provider, provider_transaction_id, status, metadata, completed_at, created_at) FROM stdin;
3f18ec27-80e1-4d0e-992a-6271bbfd6274	ca294741-3b10-4953-a3cf-43c1faaba9c0	1.080000	100.000000	RUB	allin	allin	994	pending	{}	\N	2026-02-18 05:38:31.186164+00
0fc382dc-d945-4e8d-8a0e-7ed5f5ba8876	ca294741-3b10-4953-a3cf-43c1faaba9c0	1.080000	100.000000	RUB	allin	allin	995	completed	{}	2026-02-18 05:45:01.114407+00	2026-02-18 05:44:02.272326+00
0b0d4549-4d3c-4273-a1b9-580cf80d0e92	ca294741-3b10-4953-a3cf-43c1faaba9c0	1.080000	100.000000	RUB	allin	allin	996	pending	{}	\N	2026-02-18 05:48:07.12529+00
807a00d8-24fb-4c48-bbde-52094706206f	ca294741-3b10-4953-a3cf-43c1faaba9c0	1.080000	100.000000	RUB	allin	allin	997	complete	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771393834", "allin_response": {"status": "success", "message": "", "data": {"transId": 997, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=74860313&token=vCMWoCukrtV9JXcDB9wZ"}}}	\N	2026-02-18 05:50:35.199465+00
0d2fd214-e71e-46a9-8419-01570af4bf7c	ca294741-3b10-4953-a3cf-43c1faaba9c0	1.080000	100.000000	RUB	allin	allin	998	completed	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771394099", "allin_response": {"status": "success", "message": "", "data": {"transId": 998, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=86745740&token=tWNKrzobUhdh65UfeYkr"}}}	2026-02-18 05:55:16.87002+00	2026-02-18 05:54:59.646966+00
f44e58fe-860e-4be3-8a4a-4afe8262e818	ca294741-3b10-4953-a3cf-43c1faaba9c0	3.910000	300.000000	RUB	allin	allin	999	completed	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771398604", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.7389", "allin_response": {"status": "success", "message": "", "data": {"transId": 999, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=46042988&token=JDIDVUxxWp18bWzcehim"}}}	2026-02-18 07:10:26.11877+00	2026-02-18 07:10:04.608689+00
2c9492dc-82cb-4411-9247-564812f12394	a94e6941-4159-426f-9172-12c10c9a1a61	3.910000	300.000000	RUB	allin	allin	1001	pending	{"orderId": "ALLIN-a94e6941-4159-426f-9172-12c10c9a1a61-1771404730", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.7389", "allin_response": {"status": "success", "message": "", "data": {"transId": 1001, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=89123284&token=X5TDV8gUcFySJjv9YZyl"}}}	\N	2026-02-18 08:52:10.839404+00
66b53d41-8a4a-4c3b-8dcb-264cd9d37602	ca294741-3b10-4953-a3cf-43c1faaba9c0	3.910000	300.000000	RUB	allin	allin	1000	completed	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771404713", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.7389", "allin_response": {"status": "success", "message": "", "data": {"transId": 1000, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=93121271&token=WjbuR27oVRltImfjmZHN"}}}	2026-02-18 08:52:21.735284+00	2026-02-18 08:51:53.976876+00
80fd631d-4b94-4f4b-bed3-6eca41b7a58a	a94e6941-4159-426f-9172-12c10c9a1a61	3.910000	300.000000	RUB	allin	allin	1002	completed	{"orderId": "ALLIN-a94e6941-4159-426f-9172-12c10c9a1a61-1771405009", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.7389", "allin_response": {"status": "success", "message": "", "data": {"transId": 1002, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=61150945&token=HH0nT30uAbNSK9SulPyt"}}}	2026-02-18 08:57:07.47965+00	2026-02-18 08:56:49.32901+00
56e42705-2aeb-4506-907a-7fbcdef9531e	ca294741-3b10-4953-a3cf-43c1faaba9c0	3.910000	300.000000	RUB	allin	allin	1003	pending	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771412166", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.7389", "allin_response": {"status": "success", "message": "", "data": {"transId": 1003, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=86031007&token=FtQPqt5U5LFxapVIQZXc"}}}	\N	2026-02-18 10:56:06.478351+00
c6593725-4422-410e-99af-78100adbc0e5	ca294741-3b10-4953-a3cf-43c1faaba9c0	3.910000	300.000000	RUB	allin	allin	1004	pending	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771414759", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.7389", "allin_response": {"status": "success", "message": "", "data": {"transId": 1004, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=23865283&token=cboKTSH5HJUp1fHeL48G"}}}	\N	2026-02-18 11:39:19.477243+00
621f12e9-7396-4a4a-8a3a-1542b5184eb3	ca294741-3b10-4953-a3cf-43c1faaba9c0	3.910000	300.000000	RUB	allin	allin	1005	pending	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771415678", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.7389", "allin_response": {"status": "success", "message": "", "data": {"transId": 1005, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=51612315&token=TtmfPzSgwOWF1lGzUrnL"}}}	\N	2026-02-18 11:54:38.481653+00
906d43bc-07dd-4590-85d5-34eecb555483	ca294741-3b10-4953-a3cf-43c1faaba9c0	3.910000	300.000000	RUB	allin	allin	1013	pending	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771416146", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.7389", "allin_response": {"status": "success", "message": "", "data": {"transId": 1013, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=56826264&token=IWIuQN4GSjybIx1yJwr7"}}}	\N	2026-02-18 12:02:26.536924+00
ac1b9a44-682b-4067-85bd-22b29389639a	d3589c53-534e-4040-be5f-0359515b4287	6.570000	500.000000	RUB	allin	allin	1015	pending	{"orderId": "ALLIN-d3589c53-534e-4040-be5f-0359515b4287-1771436541", "amount_rub": "500.0", "amount_usd": "6.57", "exchange_rate": "76.1524", "allin_response": {"status": "success", "message": "", "data": {"transId": 1015, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=50166067&token=ks3x8RbqPteODyTmlRNA"}}}	\N	2026-02-18 17:42:21.322467+00
5f7327ad-5c91-46c8-9ee2-8e1c16464e79	ca294741-3b10-4953-a3cf-43c1faaba9c0	3.910000	300.000000	RUB	allin	allin	1025	pending	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771594191", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.6405", "allin_response": {"status": "success", "message": "", "data": {"transId": 1025, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=13071244&token=KDWMMcdE94fjpgNneXRv"}}}	\N	2026-02-20 13:29:51.651841+00
c411405b-e8bf-4b49-b5b6-9ebb4a659a0d	ca294741-3b10-4953-a3cf-43c1faaba9c0	3.910000	300.000000	RUB	allin	allin	1028	pending	{"orderId": "ALLIN-ca294741-3b10-4953-a3cf-43c1faaba9c0-1771647314", "amount_rub": "300.0", "amount_usd": "3.91", "exchange_rate": "76.7519", "allin_response": {"status": "success", "message": "", "data": {"transId": 1028, "approvedUrl": "https://allin.direct/merchant/payment?grant_id=13683407&token=x6Tudbh0n6errpj5S4gz"}}}	\N	2026-02-21 04:15:15.249707+00
\.


--
-- Data for Name: investor_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.investor_accounts (id, user_id, name, api_key_encrypted, openrouter_account_id, initial_balance, current_balance, min_threshold, commission_rate, total_earned, total_spent, status, last_sync_at, created_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: investor_payouts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.investor_payouts (id, investor_account_id, period_start, period_end, amount_spent, commission_amount, status, paid_at, transaction_id, created_at) FROM stdin;
\.


--
-- Data for Name: investor_referral_earnings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.investor_referral_earnings (id, investor_id, referral_id, request_log_id, amount_usd, turnover_usd, created_at, status, paid_at) FROM stdin;
\.


--
-- Data for Name: investor_request_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.investor_request_logs (id, investor_account_id, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, commission_usd, status, created_at) FROM stdin;
\.


--
-- Data for Name: master_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.master_accounts (id, name, api_key_encrypted, balance_usd, discount_percent, monthly_limit_usd, monthly_used_usd, current_month, is_active, priority, last_check_at, created_at, updated_at, account_type, markup_percent, cost_basis, usage_weight) FROM stdin;
dbd1ebcf-ce6d-47c5-b719-77ebd9e7fcb4	Air2	gAAAAABpmXDFOixk3N9qJCUs_nKXUtIoQzFREaNIiYb4RCI9ZE_-Ag86v-d78g824FUkqxrXeLrKJ6WkHKb570v83YxDGV0ETR0JMCxv8ukxqLd9F-kcBOEdDNK5Anuv9oXcIum8DnGLAWSBqO8CuSse5EK3nJpYP7PLvCz0Dn4kWgRLD1B-mZY=	5.668249	0	\N	0.00	2026-02	t	1	\N	2026-02-21 08:45:57.264301+00	2026-02-21 08:46:03.003623+00	regular	5.00	1.000000	0
0674950a-3636-40ae-94e2-9e1aa6bba8a2	KeyTwo	gAAAAABpmXCJYWX1w6aFhO-7vUnT7CBTMsgtiI-PIPXNplcA1MbDfz54-OI_5VR063gOok0tvHcQbl13KiuUDm32N-PD5Okn0M_AQax3AT-nwvpEBIKlmc4K-OYCCPsUxS6y9W-saRMHPNYPj4dfMHu2-eQDOlMRMs4DMyBZ--c7t3X5Ns4dGB4=	20.547952	70	\N	0.00	2026-02	t	0	\N	2026-02-21 08:44:57.783814+00	2026-02-21 08:47:15.563492+00	discounted	-20.00	0.300000	1
\.


--
-- Data for Name: model_pricing; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.model_pricing (id, provider, display_name, prompt_price, completion_price, context_length, is_active, fetched_at, created_at, updated_at) FROM stdin;
openai/gpt-4o-mini	openai	OpenAI: GPT-4o-mini	0.000000150	0.000000600	128000	t	2026-02-21 08:16:32.99602+00	2026-02-20 15:02:06.296925+00	2026-02-21 08:16:33.134969+00
openai/gpt-4.1	openai	OpenAI: GPT-4.1	0.000002000	0.000008000	1047576	t	2026-02-20 17:57:59.524138+00	2026-02-20 15:02:06.296543+00	2026-02-20 17:57:59.675795+00
ai21/jamba-large-1.7	ai21	AI21: Jamba Large 1.7	0.000002000	0.000008000	256000	t	2026-02-20 17:57:59.466378+00	2026-02-20 15:02:06.296319+00	2026-02-20 17:57:59.649137+00
aion-labs/aion-1.0	aion-labs	AionLabs: Aion-1.0	0.000004000	0.000008000	131072	t	2026-02-20 17:57:59.562305+00	2026-02-20 15:02:06.296656+00	2026-02-20 17:57:59.649142+00
aion-labs/aion-1.0-mini	aion-labs	AionLabs: Aion-1.0-Mini	0.000000700	0.000001400	131072	t	2026-02-20 17:57:59.563073+00	2026-02-20 15:02:06.29666+00	2026-02-20 17:57:59.649144+00
aion-labs/aion-rp-llama-3.1-8b	aion-labs	AionLabs: Aion-RP 1.0 (8B)	0.000000800	0.000001600	32768	t	2026-02-20 17:57:59.563781+00	2026-02-20 15:02:06.296664+00	2026-02-20 17:57:59.649145+00
alfredpros/codellama-7b-instruct-solidity	alfredpros	AlfredPros: CodeLLaMa 7B Instruct Solidity	0.000000800	0.000001200	4096	t	2026-02-20 17:57:59.528478+00	2026-02-20 15:02:06.296553+00	2026-02-20 17:57:59.649147+00
alibaba/tongyi-deepresearch-30b-a3b	alibaba	Tongyi DeepResearch 30B A3B	0.000000090	0.000000450	131072	t	2026-02-20 17:57:59.449551+00	2026-02-20 15:02:06.296243+00	2026-02-20 17:57:59.649149+00
allenai/molmo-2-8b	allenai	AllenAI: Molmo2 8B	0.000000200	0.000000200	36864	t	2026-02-20 17:57:59.372443+00	2026-02-20 15:02:06.295865+00	2026-02-20 17:57:59.64915+00
allenai/olmo-2-0325-32b-instruct	allenai	AllenAI: Olmo 2 32B Instruct	0.000000050	0.000000200	128000	t	2026-02-20 17:57:59.536487+00	2026-02-20 15:02:06.296582+00	2026-02-20 17:57:59.649151+00
allenai/olmo-3-32b-think	allenai	AllenAI: Olmo 3 32B Think	0.000000150	0.000000500	65536	t	2026-02-20 17:57:59.407545+00	2026-02-20 15:02:06.296019+00	2026-02-20 17:57:59.649153+00
allenai/olmo-3-7b-instruct	allenai	AllenAI: Olmo 3 7B Instruct	0.000000100	0.000000200	65536	t	2026-02-20 17:57:59.408205+00	2026-02-20 15:02:06.296023+00	2026-02-20 17:57:59.649154+00
allenai/olmo-3-7b-think	allenai	AllenAI: Olmo 3 7B Think	0.000000120	0.000000200	65536	t	2026-02-20 17:57:59.408869+00	2026-02-20 15:02:06.296027+00	2026-02-20 17:57:59.649156+00
allenai/olmo-3.1-32b-instruct	allenai	AllenAI: Olmo 3.1 32B Instruct	0.000000200	0.000000600	65536	t	2026-02-20 17:57:59.375244+00	2026-02-20 15:02:06.295869+00	2026-02-20 17:57:59.649157+00
allenai/olmo-3.1-32b-think	allenai	AllenAI: Olmo 3.1 32B Think	0.000000150	0.000000500	65536	t	2026-02-20 17:57:59.382157+00	2026-02-20 15:02:06.295895+00	2026-02-20 17:57:59.649158+00
alpindale/goliath-120b	alpindale	Goliath 120B	0.000003750	0.000007500	6144	t	2026-02-20 17:57:59.633503+00	2026-02-20 15:02:06.297003+00	2026-02-20 17:57:59.64916+00
amazon/nova-2-lite-v1	amazon	Amazon: Nova 2 Lite	0.000000300	0.000002500	1000000	t	2026-02-20 17:57:59.396591+00	2026-02-20 15:02:06.29598+00	2026-02-20 17:57:59.649161+00
amazon/nova-lite-v1	amazon	Amazon: Nova Lite 1.0	0.000000060	0.000000240	300000	t	2026-02-20 17:57:59.582167+00	2026-02-20 15:02:06.29676+00	2026-02-20 17:57:59.649163+00
amazon/nova-micro-v1	amazon	Amazon: Nova Micro 1.0	0.000000035	0.000000140	128000	t	2026-02-20 17:57:59.58412+00	2026-02-20 15:02:06.296765+00	2026-02-20 17:57:59.649164+00
amazon/nova-premier-v1	amazon	Amazon: Nova Premier 1.0	0.000002500	0.000012500	1000000	t	2026-02-20 17:57:59.420023+00	2026-02-20 15:02:06.296073+00	2026-02-20 17:57:59.649165+00
amazon/nova-pro-v1	amazon	Amazon: Nova Pro 1.0	0.000000800	0.000003200	300000	t	2026-02-20 17:57:59.586171+00	2026-02-20 15:02:06.296768+00	2026-02-20 17:57:59.649167+00
anthracite-org/magnum-v4-72b	anthracite-org	Magnum v4 72B	0.000003000	0.000005000	16384	t	2026-02-20 17:57:59.591679+00	2026-02-20 15:02:06.296805+00	2026-02-20 17:57:59.649168+00
anthropic/claude-3-haiku	anthropic	Anthropic: Claude 3 Haiku	0.000000250	0.000001250	200000	t	2026-02-20 17:57:59.628166+00	2026-02-20 15:02:06.296974+00	2026-02-20 17:57:59.64917+00
anthropic/claude-3.5-haiku	anthropic	Anthropic: Claude 3.5 Haiku	0.000000800	0.000004000	200000	t	2026-02-20 17:57:59.591117+00	2026-02-20 15:02:06.296801+00	2026-02-20 17:57:59.649171+00
anthropic/claude-3.5-sonnet	anthropic	Anthropic: Claude 3.5 Sonnet	0.000006000	0.000030000	200000	t	2026-02-20 17:57:59.593126+00	2026-02-20 15:02:06.296809+00	2026-02-20 17:57:59.649172+00
anthropic/claude-3.7-sonnet	anthropic	Anthropic: Claude 3.7 Sonnet	0.000003000	0.000015000	200000	t	2026-02-20 17:57:59.552649+00	2026-02-20 15:02:06.296619+00	2026-02-20 17:57:59.649174+00
anthropic/claude-3.7-sonnet:thinking	anthropic	Anthropic: Claude 3.7 Sonnet (thinking)	0.000003000	0.000015000	200000	t	2026-02-20 17:57:59.553335+00	2026-02-20 15:02:06.296621+00	2026-02-20 17:57:59.649175+00
anthropic/claude-haiku-4.5	anthropic	Anthropic: Claude Haiku 4.5	0.000001000	0.000005000	200000	t	2026-02-20 17:57:59.426677+00	2026-02-20 15:02:06.296118+00	2026-02-20 17:57:59.649177+00
anthropic/claude-opus-4	anthropic	Anthropic: Claude Opus 4	0.000015000	0.000075000	200000	t	2026-02-20 17:57:59.506856+00	2026-02-20 15:02:06.296459+00	2026-02-20 17:57:59.649178+00
anthropic/claude-opus-4.1	anthropic	Anthropic: Claude Opus 4.1	0.000015000	0.000075000	200000	t	2026-02-20 17:57:59.47291+00	2026-02-20 15:02:06.296359+00	2026-02-20 17:57:59.649179+00
anthropic/claude-opus-4.5	anthropic	Anthropic: Claude Opus 4.5	0.000005000	0.000025000	200000	t	2026-02-20 17:57:59.405361+00	2026-02-20 15:02:06.296015+00	2026-02-20 17:57:59.649181+00
anthropic/claude-opus-4.6	anthropic	Anthropic: Claude Opus 4.6	0.000005000	0.000025000	1000000	t	2026-02-20 17:57:59.363407+00	2026-02-20 15:02:06.295829+00	2026-02-20 17:57:59.649182+00
anthropic/claude-sonnet-4	anthropic	Anthropic: Claude Sonnet 4	0.000003000	0.000015000	1000000	t	2026-02-20 17:57:59.507405+00	2026-02-20 15:02:06.296463+00	2026-02-20 17:57:59.649184+00
anthropic/claude-sonnet-4.5	anthropic	Anthropic: Claude Sonnet 4.5	0.000003000	0.000015000	1000000	t	2026-02-20 17:57:59.440574+00	2026-02-20 15:02:06.296186+00	2026-02-20 17:57:59.649185+00
anthropic/claude-sonnet-4.6	anthropic	Anthropic: Claude Sonnet 4.6	0.000003000	0.000015000	1000000	t	2026-02-20 17:57:59.353293+00	2026-02-20 15:02:06.295803+00	2026-02-20 17:57:59.649187+00
arcee-ai/coder-large	arcee-ai	Arcee AI: Coder Large	0.000000500	0.000000800	32768	t	2026-02-20 17:57:59.513411+00	2026-02-20 15:02:06.296503+00	2026-02-20 17:57:59.649188+00
arcee-ai/maestro-reasoning	arcee-ai	Arcee AI: Maestro Reasoning	0.000000900	0.000003300	131072	t	2026-02-20 17:57:59.512184+00	2026-02-20 15:02:06.296495+00	2026-02-20 17:57:59.649189+00
arcee-ai/spotlight	arcee-ai	Arcee AI: Spotlight	0.000000180	0.000000180	131072	t	2026-02-20 17:57:59.510347+00	2026-02-20 15:02:06.296479+00	2026-02-20 17:57:59.649191+00
arcee-ai/trinity-mini	arcee-ai	Arcee AI: Trinity Mini	0.000000045	0.000000150	131072	t	2026-02-20 17:57:59.399719+00	2026-02-20 15:02:06.295999+00	2026-02-20 17:57:59.649192+00
arcee-ai/virtuoso-large	arcee-ai	Arcee AI: Virtuoso Large	0.000000750	0.000001200	131072	t	2026-02-20 17:57:59.512865+00	2026-02-20 15:02:06.296499+00	2026-02-20 17:57:59.649194+00
baidu/ernie-4.5-21b-a3b	baidu	Baidu: ERNIE 4.5 21B A3B	0.000000070	0.000000280	120000	t	2026-02-20 17:57:59.464604+00	2026-02-20 15:02:06.296311+00	2026-02-20 17:57:59.649195+00
baidu/ernie-4.5-21b-a3b-thinking	baidu	Baidu: ERNIE 4.5 21B A3B Thinking	0.000000070	0.000000280	131072	t	2026-02-20 17:57:59.434799+00	2026-02-20 15:02:06.296145+00	2026-02-20 17:57:59.649196+00
baidu/ernie-4.5-300b-a47b	baidu	Baidu: ERNIE 4.5 300B A47B 	0.000000280	0.000001100	123000	t	2026-02-20 17:57:59.49511+00	2026-02-20 15:02:06.29643+00	2026-02-20 17:57:59.649198+00
baidu/ernie-4.5-vl-28b-a3b	baidu	Baidu: ERNIE 4.5 VL 28B A3B	0.000000140	0.000000560	30000	t	2026-02-20 17:57:59.46518+00	2026-02-20 15:02:06.296314+00	2026-02-20 17:57:59.649199+00
baidu/ernie-4.5-vl-424b-a47b	baidu	Baidu: ERNIE 4.5 VL 424B A47B 	0.000000420	0.000001250	123000	t	2026-02-20 17:57:59.49443+00	2026-02-20 15:02:06.296427+00	2026-02-20 17:57:59.649201+00
bytedance-seed/seed-1.6	bytedance-seed	ByteDance Seed: Seed 1.6	0.000000250	0.000002000	262144	t	2026-02-20 17:57:59.377932+00	2026-02-20 15:02:06.295876+00	2026-02-20 17:57:59.649202+00
bytedance-seed/seed-1.6-flash	bytedance-seed	ByteDance Seed: Seed 1.6 Flash	0.000000075	0.000000300	262144	t	2026-02-20 17:57:59.376732+00	2026-02-20 15:02:06.295873+00	2026-02-20 17:57:59.649203+00
bytedance/ui-tars-1.5-7b	bytedance	ByteDance: UI-TARS 7B 	0.000000100	0.000000200	128000	t	2026-02-20 17:57:59.483672+00	2026-02-20 15:02:06.296384+00	2026-02-20 17:57:59.649205+00
cohere/command-a	cohere	Cohere: Command A	0.000002500	0.000010000	256000	t	2026-02-20 17:57:59.541404+00	2026-02-20 15:02:06.29659+00	2026-02-20 17:57:59.649206+00
cohere/command-r-08-2024	cohere	Cohere: Command R (08-2024)	0.000000150	0.000000600	128000	t	2026-02-20 17:57:59.602569+00	2026-02-20 15:02:06.29687+00	2026-02-20 17:57:59.649208+00
cohere/command-r-plus-08-2024	cohere	Cohere: Command R+ (08-2024)	0.000002500	0.000010000	128000	t	2026-02-20 17:57:59.603143+00	2026-02-20 15:02:06.296874+00	2026-02-20 17:57:59.649209+00
cohere/command-r7b-12-2024	cohere	Cohere: Command R7B (12-2024)	0.000000038	0.000000150	128000	t	2026-02-20 17:57:59.581055+00	2026-02-20 15:02:06.296733+00	2026-02-20 17:57:59.667357+00
deepcogito/cogito-v2.1-671b	deepcogito	Deep Cogito: Cogito v2.1 671B	0.000001250	0.000001250	128000	t	2026-02-20 17:57:59.411188+00	2026-02-20 15:02:06.296044+00	2026-02-20 17:57:59.675592+00
deepseek/deepseek-chat	deepseek	DeepSeek: DeepSeek V3	0.000000320	0.000000890	163840	t	2026-02-20 17:57:59.579091+00	2026-02-20 15:02:06.296722+00	2026-02-20 17:57:59.675599+00
deepseek/deepseek-chat-v3-0324	deepseek	DeepSeek: DeepSeek V3 0324	0.000000190	0.000000870	163840	t	2026-02-20 17:57:59.53352+00	2026-02-20 15:02:06.296573+00	2026-02-20 17:57:59.675601+00
deepseek/deepseek-chat-v3.1	deepseek	DeepSeek: DeepSeek V3.1	0.000000150	0.000000750	32768	t	2026-02-20 17:57:59.461715+00	2026-02-20 15:02:06.296302+00	2026-02-20 17:57:59.675603+00
deepseek/deepseek-r1	deepseek	DeepSeek: R1	0.000000700	0.000002500	64000	t	2026-02-20 17:57:59.574395+00	2026-02-20 15:02:06.296707+00	2026-02-20 17:57:59.675604+00
deepseek/deepseek-r1-0528	deepseek	DeepSeek: R1 0528	0.000000400	0.000001750	163840	t	2026-02-20 17:57:59.506263+00	2026-02-20 15:02:06.296456+00	2026-02-20 17:57:59.675606+00
deepseek/deepseek-r1-distill-llama-70b	deepseek	DeepSeek: R1 Distill Llama 70B	0.000000700	0.000000800	131072	t	2026-02-20 17:57:59.571698+00	2026-02-20 15:02:06.296703+00	2026-02-20 17:57:59.675608+00
deepseek/deepseek-r1-distill-qwen-32b	deepseek	DeepSeek: R1 Distill Qwen 32B	0.000000290	0.000000290	32768	t	2026-02-20 17:57:59.570407+00	2026-02-20 15:02:06.296696+00	2026-02-20 17:57:59.675609+00
deepseek/deepseek-v3.1-terminus	deepseek	DeepSeek: DeepSeek V3.1 Terminus	0.000000210	0.000000790	163840	t	2026-02-20 17:57:59.448437+00	2026-02-20 15:02:06.296234+00	2026-02-20 17:57:59.675611+00
deepseek/deepseek-v3.1-terminus:exacto	deepseek	DeepSeek: DeepSeek V3.1 Terminus (exacto)	0.000000210	0.000000790	163840	t	2026-02-20 17:57:59.447789+00	2026-02-20 15:02:06.29623+00	2026-02-20 17:57:59.675613+00
deepseek/deepseek-v3.2	deepseek	DeepSeek: DeepSeek V3.2	0.000000260	0.000000380	163840	t	2026-02-20 17:57:59.403213+00	2026-02-20 15:02:06.296007+00	2026-02-20 17:57:59.675614+00
deepseek/deepseek-v3.2-exp	deepseek	DeepSeek: DeepSeek V3.2 Exp	0.000000270	0.000000410	163840	t	2026-02-20 17:57:59.4432+00	2026-02-20 15:02:06.29619+00	2026-02-20 17:57:59.675616+00
deepseek/deepseek-v3.2-speciale	deepseek	DeepSeek: DeepSeek V3.2 Speciale	0.000000400	0.000001200	163840	t	2026-02-20 17:57:59.400284+00	2026-02-20 15:02:06.296003+00	2026-02-20 17:57:59.675617+00
eleutherai/llemma_7b	eleutherai	EleutherAI: Llemma 7b	0.000000800	0.000001200	4096	t	2026-02-20 17:57:59.527862+00	2026-02-20 15:02:06.296551+00	2026-02-20 17:57:59.675619+00
essentialai/rnj-1-instruct	essentialai	EssentialAI: Rnj 1 Instruct	0.000000150	0.000000150	32768	t	2026-02-20 17:57:59.394678+00	2026-02-20 15:02:06.295934+00	2026-02-20 17:57:59.675621+00
google/gemini-2.0-flash-001	google	Google: Gemini 2.0 Flash	0.000000100	0.000000400	1048576	t	2026-02-20 17:57:59.558225+00	2026-02-20 15:02:06.296647+00	2026-02-20 17:57:59.675622+00
google/gemini-2.0-flash-lite-001	google	Google: Gemini 2.0 Flash Lite	0.000000075	0.000000300	1048576	t	2026-02-20 17:57:59.551705+00	2026-02-20 15:02:06.296616+00	2026-02-20 17:57:59.675624+00
google/gemini-2.5-flash	google	Google: Gemini 2.5 Flash	0.000000300	0.000002500	1048576	t	2026-02-20 17:57:59.50045+00	2026-02-20 15:02:06.296441+00	2026-02-20 17:57:59.675625+00
google/gemini-2.5-flash-image	google	Google: Gemini 2.5 Flash Image (Nano Banana)	0.000000300	0.000002500	32768	t	2026-02-20 17:57:59.435424+00	2026-02-20 15:02:06.29615+00	2026-02-20 17:57:59.675627+00
google/gemini-2.5-flash-lite	google	Google: Gemini 2.5 Flash Lite	0.000000100	0.000000400	1048576	t	2026-02-20 17:57:59.484266+00	2026-02-20 15:02:06.296387+00	2026-02-20 17:57:59.675629+00
google/gemini-2.5-flash-lite-preview-09-2025	google	Google: Gemini 2.5 Flash Lite Preview 09-2025	0.000000100	0.000000400	1048576	t	2026-02-20 17:57:59.444986+00	2026-02-20 15:02:06.296208+00	2026-02-20 17:57:59.67563+00
google/gemini-2.5-pro	google	Google: Gemini 2.5 Pro	0.000001250	0.000010000	1048576	t	2026-02-20 17:57:59.501238+00	2026-02-20 15:02:06.296443+00	2026-02-20 17:57:59.675631+00
google/gemini-2.5-pro-preview	google	Google: Gemini 2.5 Pro Preview 06-05	0.000001250	0.000010000	1048576	t	2026-02-20 17:57:59.50559+00	2026-02-20 15:02:06.296454+00	2026-02-20 17:57:59.675633+00
google/gemini-2.5-pro-preview-05-06	google	Google: Gemini 2.5 Pro Preview 05-06	0.000001250	0.000010000	1048576	t	2026-02-20 17:57:59.509715+00	2026-02-20 15:02:06.296475+00	2026-02-20 17:57:59.675635+00
google/gemini-3-flash-preview	google	Google: Gemini 3 Flash Preview	0.000000500	0.000003000	1048576	t	2026-02-20 17:57:59.380731+00	2026-02-20 15:02:06.295887+00	2026-02-20 17:57:59.675636+00
google/gemini-3-pro-image-preview	google	Google: Nano Banana Pro (Gemini 3 Pro Image Preview)	0.000002000	0.000012000	65536	t	2026-02-20 17:57:59.409422+00	2026-02-20 15:02:06.296031+00	2026-02-20 17:57:59.675638+00
google/gemini-3-pro-preview	google	Google: Gemini 3 Pro Preview	0.000002000	0.000012000	1048576	t	2026-02-20 17:57:59.410627+00	2026-02-20 15:02:06.296039+00	2026-02-20 17:57:59.675639+00
google/gemini-3.1-pro-preview	google	Google: Gemini 3.1 Pro Preview	0.000002000	0.000012000	1048576	t	2026-02-20 17:57:59.351515+00	2026-02-20 15:02:06.294731+00	2026-02-20 17:57:59.675641+00
google/gemma-2-27b-it	google	Google: Gemma 2 27B	0.000000650	0.000000650	8192	t	2026-02-20 17:57:59.615168+00	2026-02-20 15:02:06.296929+00	2026-02-20 17:57:59.675642+00
google/gemma-2-9b-it	google	Google: Gemma 2 9B	0.000000030	0.000000090	8192	t	2026-02-20 17:57:59.615685+00	2026-02-20 15:02:06.296933+00	2026-02-20 17:57:59.675644+00
google/gemma-3-12b-it	google	Google: Gemma 3 12B	0.000000040	0.000000130	131072	t	2026-02-20 17:57:59.538196+00	2026-02-20 15:02:06.296588+00	2026-02-20 17:57:59.675645+00
google/gemma-3-27b-it	google	Google: Gemma 3 27B	0.000000040	0.000000150	128000	t	2026-02-20 17:57:59.547265+00	2026-02-20 15:02:06.296599+00	2026-02-20 17:57:59.675647+00
google/gemma-3-4b-it	google	Google: Gemma 3 4B	0.000000040	0.000000080	131072	t	2026-02-20 17:57:59.537227+00	2026-02-20 15:02:06.296585+00	2026-02-20 17:57:59.675648+00
google/gemma-3n-e4b-it	google	Google: Gemma 3n 4B	0.000000020	0.000000040	32768	t	2026-02-20 17:57:59.507977+00	2026-02-20 15:02:06.296467+00	2026-02-20 17:57:59.67565+00
gryphe/mythomax-l2-13b	gryphe	MythoMax 13B	0.000000060	0.000000060	4096	t	2026-02-20 17:57:59.641629+00	2026-02-20 15:02:06.297039+00	2026-02-20 17:57:59.675652+00
ibm-granite/granite-4.0-h-micro	ibm-granite	IBM: Granite 4.0 Micro	0.000000017	0.000000110	131000	t	2026-02-20 17:57:59.42557+00	2026-02-20 15:02:06.29611+00	2026-02-20 17:57:59.675653+00
inception/mercury	inception	Inception: Mercury	0.000000250	0.000001000	128000	t	2026-02-20 17:57:59.495761+00	2026-02-20 15:02:06.296433+00	2026-02-20 17:57:59.675655+00
inception/mercury-coder	inception	Inception: Mercury Coder	0.000000250	0.000001000	128000	t	2026-02-20 17:57:59.514059+00	2026-02-20 15:02:06.296507+00	2026-02-20 17:57:59.675657+00
inflection/inflection-3-pi	inflection	Inflection: Inflection 3 Pi	0.000002500	0.000010000	8000	t	2026-02-20 17:57:59.595906+00	2026-02-20 15:02:06.296822+00	2026-02-20 17:57:59.675658+00
inflection/inflection-3-productivity	inflection	Inflection: Inflection 3 Productivity	0.000002500	0.000010000	8000	t	2026-02-20 17:57:59.596443+00	2026-02-20 15:02:06.29684+00	2026-02-20 17:57:59.67566+00
kwaipilot/kat-coder-pro	kwaipilot	Kwaipilot: KAT-Coder-Pro V1	0.000000207	0.000000828	256000	t	2026-02-20 17:57:59.416351+00	2026-02-20 15:02:06.296065+00	2026-02-20 17:57:59.675661+00
liquid/lfm-2.2-6b	liquid	LiquidAI: LFM2-2.6B	0.000000010	0.000000020	32768	t	2026-02-20 17:57:59.424926+00	2026-02-20 15:02:06.296106+00	2026-02-20 17:57:59.675663+00
liquid/lfm2-8b-a1b	liquid	LiquidAI: LFM2-8B-A1B	0.000000010	0.000000020	32768	t	2026-02-20 17:57:59.424365+00	2026-02-20 15:02:06.296102+00	2026-02-20 17:57:59.675664+00
mancer/weaver	mancer	Mancer: Weaver (alpha)	0.000000750	0.000001000	8000	t	2026-02-20 17:57:59.640547+00	2026-02-20 15:02:06.297031+00	2026-02-20 17:57:59.675666+00
meituan/longcat-flash-chat	meituan	Meituan: LongCat Flash Chat	0.000000200	0.000000800	131072	t	2026-02-20 17:57:59.454103+00	2026-02-20 15:02:06.296264+00	2026-02-20 17:57:59.675667+00
meta-llama/llama-3-70b-instruct	meta-llama	Meta: Llama 3 70B Instruct	0.000000510	0.000000740	8192	t	2026-02-20 17:57:59.624252+00	2026-02-20 15:02:06.296961+00	2026-02-20 17:57:59.675669+00
meta-llama/llama-3-8b-instruct	meta-llama	Meta: Llama 3 8B Instruct	0.000000030	0.000000040	8192	t	2026-02-20 17:57:59.624939+00	2026-02-20 15:02:06.296964+00	2026-02-20 17:57:59.67567+00
meta-llama/llama-3.1-405b	meta-llama	Meta: Llama 3.1 405B (base)	0.000004000	0.000004000	32768	t	2026-02-20 17:57:59.609539+00	2026-02-20 15:02:06.296902+00	2026-02-20 17:57:59.675672+00
meta-llama/llama-3.1-405b-instruct	meta-llama	Meta: Llama 3.1 405B Instruct	0.000004000	0.000004000	131000	t	2026-02-20 17:57:59.610581+00	2026-02-20 15:02:06.29691+00	2026-02-20 17:57:59.675673+00
meta-llama/llama-3.1-70b-instruct	meta-llama	Meta: Llama 3.1 70B Instruct	0.000000400	0.000000400	131072	t	2026-02-20 17:57:59.612988+00	2026-02-20 15:02:06.296914+00	2026-02-20 17:57:59.675675+00
meta-llama/llama-3.1-8b-instruct	meta-llama	Meta: Llama 3.1 8B Instruct	0.000000020	0.000000050	16384	t	2026-02-20 17:57:59.610061+00	2026-02-20 15:02:06.296906+00	2026-02-20 17:57:59.675676+00
meta-llama/llama-3.2-11b-vision-instruct	meta-llama	Meta: Llama 3.2 11B Vision Instruct	0.000000049	0.000000049	131072	t	2026-02-20 17:57:59.600192+00	2026-02-20 15:02:06.296858+00	2026-02-20 17:57:59.675678+00
meta-llama/llama-3.2-1b-instruct	meta-llama	Meta: Llama 3.2 1B Instruct	0.000000027	0.000000200	60000	t	2026-02-20 17:57:59.599566+00	2026-02-20 15:02:06.296853+00	2026-02-20 17:57:59.675679+00
meta-llama/llama-3.2-3b-instruct	meta-llama	Meta: Llama 3.2 3B Instruct	0.000000020	0.000000020	131072	t	2026-02-20 17:57:59.598894+00	2026-02-20 15:02:06.296849+00	2026-02-20 17:57:59.67568+00
meta-llama/llama-3.3-70b-instruct	meta-llama	Meta: Llama 3.3 70B Instruct	0.000000100	0.000000320	131072	t	2026-02-20 17:57:59.581601+00	2026-02-20 15:02:06.296737+00	2026-02-20 17:57:59.675682+00
meta-llama/llama-4-maverick	meta-llama	Meta: Llama 4 Maverick	0.000000150	0.000000600	1048576	t	2026-02-20 17:57:59.53185+00	2026-02-20 15:02:06.296564+00	2026-02-20 17:57:59.675683+00
meta-llama/llama-4-scout	meta-llama	Meta: Llama 4 Scout	0.000000080	0.000000300	327680	t	2026-02-20 17:57:59.532377+00	2026-02-20 15:02:06.296567+00	2026-02-20 17:57:59.675684+00
meta-llama/llama-guard-2-8b	meta-llama	Meta: LlamaGuard 2 8B	0.000000200	0.000000200	8192	t	2026-02-20 17:57:59.619835+00	2026-02-20 15:02:06.29695+00	2026-02-20 17:57:59.675686+00
meta-llama/llama-guard-3-8b	meta-llama	Llama Guard 3 8B	0.000000020	0.000000060	131072	t	2026-02-20 17:57:59.554798+00	2026-02-20 15:02:06.296639+00	2026-02-20 17:57:59.675687+00
meta-llama/llama-guard-4-12b	meta-llama	Meta: Llama Guard 4 12B	0.000000180	0.000000180	163840	t	2026-02-20 17:57:59.514627+00	2026-02-20 15:02:06.296511+00	2026-02-20 17:57:59.675689+00
microsoft/phi-4	microsoft	Microsoft: Phi 4	0.000000060	0.000000140	16384	t	2026-02-20 17:57:59.575976+00	2026-02-20 15:02:06.296715+00	2026-02-20 17:57:59.67569+00
microsoft/wizardlm-2-8x22b	microsoft	WizardLM-2 8x22B	0.000000620	0.000000620	65535	t	2026-02-20 17:57:59.626829+00	2026-02-20 15:02:06.296969+00	2026-02-20 17:57:59.675691+00
minimax/minimax-01	minimax	MiniMax: MiniMax-01	0.000000200	0.000001100	1000192	t	2026-02-20 17:57:59.575357+00	2026-02-20 15:02:06.296711+00	2026-02-20 17:57:59.675693+00
minimax/minimax-m1	minimax	MiniMax: MiniMax M1	0.000000400	0.000002200	1000000	t	2026-02-20 17:57:59.499072+00	2026-02-20 15:02:06.296438+00	2026-02-20 17:57:59.675694+00
minimax/minimax-m2	minimax	MiniMax: MiniMax M2	0.000000255	0.000001000	196608	t	2026-02-20 17:57:59.423222+00	2026-02-20 15:02:06.296094+00	2026-02-20 17:57:59.675696+00
minimax/minimax-m2-her	minimax	MiniMax: MiniMax M2-her	0.000000300	0.000001200	65536	t	2026-02-20 17:57:59.367489+00	2026-02-20 15:02:06.295844+00	2026-02-20 17:57:59.675697+00
minimax/minimax-m2.1	minimax	MiniMax: MiniMax M2.1	0.000000270	0.000000950	196608	t	2026-02-20 17:57:59.378649+00	2026-02-20 15:02:06.29588+00	2026-02-20 17:57:59.675698+00
minimax/minimax-m2.5	minimax	MiniMax: MiniMax M2.5	0.000000300	0.000001100	196608	t	2026-02-20 17:57:59.361018+00	2026-02-20 15:02:06.295818+00	2026-02-20 17:57:59.6757+00
mistralai/codestral-2508	mistralai	Mistral: Codestral 2508	0.000000300	0.000000900	256000	t	2026-02-20 17:57:59.475018+00	2026-02-20 15:02:06.296361+00	2026-02-20 17:57:59.675701+00
mistralai/devstral-2512	mistralai	Mistral: Devstral 2 2512	0.000000400	0.000002000	262144	t	2026-02-20 17:57:59.39184+00	2026-02-20 15:02:06.295918+00	2026-02-20 17:57:59.675703+00
mistralai/devstral-medium	mistralai	Mistral: Devstral Medium	0.000000400	0.000002000	131072	t	2026-02-20 17:57:59.48898+00	2026-02-20 15:02:06.296397+00	2026-02-20 17:57:59.675704+00
mistralai/devstral-small	mistralai	Mistral: Devstral Small 1.1	0.000000100	0.000000300	131072	t	2026-02-20 17:57:59.489538+00	2026-02-20 15:02:06.2964+00	2026-02-20 17:57:59.675706+00
mistralai/ministral-14b-2512	mistralai	Mistral: Ministral 3 14B 2512	0.000000200	0.000000200	262144	t	2026-02-20 17:57:59.397231+00	2026-02-20 15:02:06.295984+00	2026-02-20 17:57:59.675707+00
mistralai/ministral-3b-2512	mistralai	Mistral: Ministral 3 3B 2512	0.000000100	0.000000100	131072	t	2026-02-20 17:57:59.398569+00	2026-02-20 15:02:06.295991+00	2026-02-20 17:57:59.675708+00
mistralai/ministral-8b-2512	mistralai	Mistral: Ministral 3 8B 2512	0.000000150	0.000000150	262144	t	2026-02-20 17:57:59.397965+00	2026-02-20 15:02:06.295988+00	2026-02-20 17:57:59.67571+00
mistralai/mistral-7b-instruct	mistralai	Mistral: Mistral 7B Instruct	0.000000200	0.000000200	32768	t	2026-02-20 17:57:59.618602+00	2026-02-20 15:02:06.296944+00	2026-02-20 17:57:59.675711+00
mistralai/mistral-7b-instruct-v0.1	mistralai	Mistral: Mistral 7B Instruct v0.1	0.000000110	0.000000190	2824	t	2026-02-20 17:57:59.639295+00	2026-02-20 15:02:06.297024+00	2026-02-20 17:57:59.675713+00
mistralai/mistral-7b-instruct-v0.2	mistralai	Mistral: Mistral 7B Instruct v0.2	0.000000200	0.000000200	32768	t	2026-02-20 17:57:59.631845+00	2026-02-20 15:02:06.296985+00	2026-02-20 17:57:59.675714+00
mistralai/mistral-7b-instruct-v0.3	mistralai	Mistral: Mistral 7B Instruct v0.3	0.000000200	0.000000200	32768	t	2026-02-20 17:57:59.619253+00	2026-02-20 15:02:06.296947+00	2026-02-20 17:57:59.675715+00
mistralai/mistral-large	mistralai	Mistral Large	0.000002000	0.000006000	128000	t	2026-02-20 17:57:59.628935+00	2026-02-20 15:02:06.296977+00	2026-02-20 17:57:59.675717+00
mistralai/mistral-large-2407	mistralai	Mistral Large 2407	0.000002000	0.000006000	131072	t	2026-02-20 17:57:59.587977+00	2026-02-20 15:02:06.29678+00	2026-02-20 17:57:59.675718+00
mistralai/mistral-large-2411	mistralai	Mistral Large 2411	0.000002000	0.000006000	131072	t	2026-02-20 17:57:59.58742+00	2026-02-20 15:02:06.296776+00	2026-02-20 17:57:59.675719+00
mistralai/mistral-large-2512	mistralai	Mistral: Mistral Large 3 2512	0.000000500	0.000001500	262144	t	2026-02-20 17:57:59.399167+00	2026-02-20 15:02:06.295995+00	2026-02-20 17:57:59.675721+00
mistralai/mistral-medium-3	mistralai	Mistral: Mistral Medium 3	0.000000400	0.000002000	131072	t	2026-02-20 17:57:59.509088+00	2026-02-20 15:02:06.296471+00	2026-02-20 17:57:59.675722+00
mistralai/mistral-medium-3.1	mistralai	Mistral: Mistral Medium 3.1	0.000000400	0.000002000	131072	t	2026-02-20 17:57:59.463979+00	2026-02-20 15:02:06.296308+00	2026-02-20 17:57:59.675724+00
mistralai/mistral-nemo	mistralai	Mistral: Mistral Nemo	0.000000020	0.000000040	131072	t	2026-02-20 17:57:59.61361+00	2026-02-20 15:02:06.296918+00	2026-02-20 17:57:59.675725+00
mistralai/mistral-saba	mistralai	Mistral: Saba	0.000000200	0.000000600	32768	t	2026-02-20 17:57:59.554063+00	2026-02-20 15:02:06.296635+00	2026-02-20 17:57:59.675726+00
mistralai/mistral-small-24b-instruct-2501	mistralai	Mistral: Mistral Small 3	0.000000050	0.000000080	32768	t	2026-02-20 17:57:59.569836+00	2026-02-20 15:02:06.296692+00	2026-02-20 17:57:59.675728+00
mistralai/mistral-small-3.1-24b-instruct	mistralai	Mistral: Mistral Small 3.1 24B	0.000000350	0.000000560	128000	t	2026-02-20 17:57:59.535855+00	2026-02-20 15:02:06.296579+00	2026-02-20 17:57:59.675729+00
mistralai/mistral-small-3.2-24b-instruct	mistralai	Mistral: Mistral Small 3.2 24B	0.000000060	0.000000180	131072	t	2026-02-20 17:57:59.498263+00	2026-02-20 15:02:06.296436+00	2026-02-20 17:57:59.675731+00
mistralai/mistral-small-creative	mistralai	Mistral: Mistral Small Creative	0.000000100	0.000000300	32768	t	2026-02-20 17:57:59.381463+00	2026-02-20 15:02:06.295891+00	2026-02-20 17:57:59.675732+00
mistralai/mixtral-8x22b-instruct	mistralai	Mistral: Mixtral 8x22B Instruct	0.000002000	0.000006000	65536	t	2026-02-20 17:57:59.626148+00	2026-02-20 15:02:06.296967+00	2026-02-20 17:57:59.675734+00
mistralai/mixtral-8x7b-instruct	mistralai	Mistral: Mixtral 8x7B Instruct	0.000000540	0.000000540	32768	t	2026-02-20 17:57:59.632373+00	2026-02-20 15:02:06.296997+00	2026-02-20 17:57:59.675735+00
mistralai/pixtral-large-2411	mistralai	Mistral: Pixtral Large 2411	0.000002000	0.000006000	131072	t	2026-02-20 17:57:59.588624+00	2026-02-20 15:02:06.296784+00	2026-02-20 17:57:59.675737+00
mistralai/voxtral-small-24b-2507	mistralai	Mistral: Voxtral Small 24B 2507	0.000000100	0.000000300	32000	t	2026-02-20 17:57:59.421305+00	2026-02-20 15:02:06.296082+00	2026-02-20 17:57:59.675738+00
moonshotai/kimi-k2	moonshotai	MoonshotAI: Kimi K2 0711	0.000000500	0.000002400	131072	t	2026-02-20 17:57:59.488409+00	2026-02-20 15:02:06.296395+00	2026-02-20 17:57:59.675753+00
moonshotai/kimi-k2-0905	moonshotai	MoonshotAI: Kimi K2 0905	0.000000400	0.000002000	131072	t	2026-02-20 17:57:59.457633+00	2026-02-20 15:02:06.296281+00	2026-02-20 17:57:59.675755+00
moonshotai/kimi-k2-0905:exacto	moonshotai	MoonshotAI: Kimi K2 0905 (exacto)	0.000000600	0.000002500	262144	t	2026-02-20 17:57:59.459002+00	2026-02-20 15:02:06.296285+00	2026-02-20 17:57:59.675756+00
moonshotai/kimi-k2-thinking	moonshotai	MoonshotAI: Kimi K2 Thinking	0.000000470	0.000002000	131072	t	2026-02-20 17:57:59.419108+00	2026-02-20 15:02:06.296069+00	2026-02-20 17:57:59.675757+00
moonshotai/kimi-k2.5	moonshotai	MoonshotAI: Kimi K2.5	0.000000230	0.000003000	262144	t	2026-02-20 17:57:59.36685+00	2026-02-20 15:02:06.29584+00	2026-02-20 17:57:59.675759+00
morph/morph-v3-fast	morph	Morph: Morph V3 Fast	0.000000800	0.000001200	81920	t	2026-02-20 17:57:59.493726+00	2026-02-20 15:02:06.296424+00	2026-02-20 17:57:59.67576+00
morph/morph-v3-large	morph	Morph: Morph V3 Large	0.000000900	0.000001900	262144	t	2026-02-20 17:57:59.493057+00	2026-02-20 15:02:06.29641+00	2026-02-20 17:57:59.675762+00
neversleep/llama-3.1-lumimaid-8b	neversleep	NeverSleep: Lumimaid v0.2 8B	0.000000090	0.000000600	32768	t	2026-02-20 17:57:59.601973+00	2026-02-20 15:02:06.296866+00	2026-02-20 17:57:59.675763+00
neversleep/noromaid-20b	neversleep	Noromaid 20B	0.000001000	0.000001750	4096	t	2026-02-20 17:57:59.632907+00	2026-02-20 15:02:06.297+00	2026-02-20 17:57:59.675764+00
nex-agi/deepseek-v3.1-nex-n1	nex-agi	Nex AGI: DeepSeek V3.1 Nex N1	0.000000270	0.000001000	131072	t	2026-02-20 17:57:59.394084+00	2026-02-20 15:02:06.29593+00	2026-02-20 17:57:59.675766+00
nousresearch/hermes-2-pro-llama-3-8b	nousresearch	NousResearch: Hermes 2 Pro - Llama-3 8B	0.000000140	0.000000140	8192	t	2026-02-20 17:57:59.617995+00	2026-02-20 15:02:06.296941+00	2026-02-20 17:57:59.675767+00
nousresearch/hermes-3-llama-3.1-405b	nousresearch	Nous: Hermes 3 405B Instruct	0.000001000	0.000001000	131072	t	2026-02-20 17:57:59.607883+00	2026-02-20 15:02:06.29689+00	2026-02-20 17:57:59.675768+00
nousresearch/hermes-3-llama-3.1-70b	nousresearch	Nous: Hermes 3 70B Instruct	0.000000300	0.000000300	65536	t	2026-02-20 17:57:59.606632+00	2026-02-20 15:02:06.296886+00	2026-02-20 17:57:59.67577+00
nousresearch/hermes-4-405b	nousresearch	Nous: Hermes 4 405B	0.000001000	0.000003000	131072	t	2026-02-20 17:57:59.461191+00	2026-02-20 15:02:06.296299+00	2026-02-20 17:57:59.675771+00
nousresearch/hermes-4-70b	nousresearch	Nous: Hermes 4 70B	0.000000130	0.000000400	131072	t	2026-02-20 17:57:59.460646+00	2026-02-20 15:02:06.296296+00	2026-02-20 17:57:59.675773+00
nvidia/llama-3.1-nemotron-70b-instruct	nvidia	NVIDIA: Llama 3.1 Nemotron 70B Instruct	0.000001200	0.000001200	131072	t	2026-02-20 17:57:59.595252+00	2026-02-20 15:02:06.296818+00	2026-02-20 17:57:59.675774+00
nvidia/llama-3.1-nemotron-ultra-253b-v1	nvidia	NVIDIA: Llama 3.1 Nemotron Ultra 253B v1	0.000000600	0.000001800	131072	t	2026-02-20 17:57:59.531175+00	2026-02-20 15:02:06.296562+00	2026-02-20 17:57:59.675775+00
nvidia/llama-3.3-nemotron-super-49b-v1.5	nvidia	NVIDIA: Llama 3.3 Nemotron Super 49B V1.5	0.000000100	0.000000400	131072	t	2026-02-20 17:57:59.434175+00	2026-02-20 15:02:06.296142+00	2026-02-20 17:57:59.675777+00
nvidia/nemotron-3-nano-30b-a3b	nvidia	NVIDIA: Nemotron 3 Nano 30B A3B	0.000000050	0.000000200	262144	t	2026-02-20 17:57:59.38615+00	2026-02-20 15:02:06.295902+00	2026-02-20 17:57:59.675778+00
nvidia/nemotron-nano-12b-v2-vl	nvidia	NVIDIA: Nemotron Nano 12B 2 VL	0.000000070	0.000000200	131072	t	2026-02-20 17:57:59.422542+00	2026-02-20 15:02:06.29609+00	2026-02-20 17:57:59.67578+00
nvidia/nemotron-nano-9b-v2	nvidia	NVIDIA: Nemotron Nano 9B V2	0.000000040	0.000000160	131072	t	2026-02-20 17:57:59.457081+00	2026-02-20 15:02:06.296276+00	2026-02-20 17:57:59.675781+00
openai/gpt-3.5-turbo	openai	OpenAI: GPT-3.5 Turbo	0.000000500	0.000001500	16385	t	2026-02-20 17:57:59.644087+00	2026-02-20 15:02:06.297049+00	2026-02-20 17:57:59.675782+00
openai/gpt-3.5-turbo-0613	openai	OpenAI: GPT-3.5 Turbo (older v0613)	0.000001000	0.000002000	4095	t	2026-02-20 17:57:59.630578+00	2026-02-20 15:02:06.29698+00	2026-02-20 17:57:59.675784+00
openai/gpt-3.5-turbo-16k	openai	OpenAI: GPT-3.5 Turbo 16k	0.000003000	0.000004000	16385	t	2026-02-20 17:57:59.640002+00	2026-02-20 15:02:06.297027+00	2026-02-20 17:57:59.675785+00
openai/gpt-3.5-turbo-instruct	openai	OpenAI: GPT-3.5 Turbo Instruct	0.000001500	0.000002000	4095	t	2026-02-20 17:57:59.63533+00	2026-02-20 15:02:06.297016+00	2026-02-20 17:57:59.675787+00
openai/gpt-4	openai	OpenAI: GPT-4	0.000030000	0.000060000	8191	t	2026-02-20 17:57:59.643513+00	2026-02-20 15:02:06.297046+00	2026-02-20 17:57:59.675788+00
openai/gpt-4-0314	openai	OpenAI: GPT-4 (older v0314)	0.000030000	0.000060000	8191	t	2026-02-20 17:57:59.642945+00	2026-02-20 15:02:06.297042+00	2026-02-20 17:57:59.675789+00
openai/gpt-4-1106-preview	openai	OpenAI: GPT-4 Turbo (older v1106)	0.000010000	0.000030000	128000	t	2026-02-20 17:57:59.63461+00	2026-02-20 15:02:06.297011+00	2026-02-20 17:57:59.675791+00
openai/gpt-4-turbo	openai	OpenAI: GPT-4 Turbo	0.000010000	0.000030000	128000	t	2026-02-20 17:57:59.627493+00	2026-02-20 15:02:06.296972+00	2026-02-20 17:57:59.675792+00
openai/gpt-4-turbo-preview	openai	OpenAI: GPT-4 Turbo Preview	0.000010000	0.000030000	128000	t	2026-02-20 17:57:59.631199+00	2026-02-20 15:02:06.296982+00	2026-02-20 17:57:59.675794+00
openai/gpt-4.1-mini	openai	OpenAI: GPT-4.1 Mini	0.000000400	0.000001600	1047576	t	2026-02-20 17:57:59.524773+00	2026-02-20 15:02:06.296546+00	2026-02-20 17:57:59.675796+00
openai/gpt-4.1-nano	openai	OpenAI: GPT-4.1 Nano	0.000000100	0.000000400	1047576	t	2026-02-20 17:57:59.527178+00	2026-02-20 15:02:06.296548+00	2026-02-20 17:57:59.675798+00
openai/gpt-4o	openai	OpenAI: GPT-4o	0.000002500	0.000010000	128000	t	2026-02-20 17:57:59.620936+00	2026-02-20 15:02:06.296955+00	2026-02-20 17:57:59.675799+00
openai/gpt-4o-2024-05-13	openai	OpenAI: GPT-4o (2024-05-13)	0.000005000	0.000015000	128000	t	2026-02-20 17:57:59.620368+00	2026-02-20 15:02:06.296953+00	2026-02-20 17:57:59.6758+00
openai/gpt-4o-2024-08-06	openai	OpenAI: GPT-4o (2024-08-06)	0.000002500	0.000010000	128000	t	2026-02-20 17:57:59.609028+00	2026-02-20 15:02:06.296898+00	2026-02-20 17:57:59.675802+00
openai/gpt-4o-2024-11-20	openai	OpenAI: GPT-4o (2024-11-20)	0.000002500	0.000010000	128000	t	2026-02-20 17:57:59.586842+00	2026-02-20 15:02:06.296772+00	2026-02-20 17:57:59.675803+00
openai/gpt-4o-audio-preview	openai	OpenAI: GPT-4o Audio	0.000002500	0.000010000	128000	t	2026-02-20 17:57:59.462276+00	2026-02-20 15:02:06.296305+00	2026-02-20 17:57:59.675805+00
openai/gpt-4o-mini-2024-07-18	openai	OpenAI: GPT-4o-mini (2024-07-18)	0.000000150	0.000000600	128000	t	2026-02-20 17:57:59.614138+00	2026-02-20 15:02:06.296921+00	2026-02-20 17:57:59.675807+00
openai/gpt-4o-mini-search-preview	openai	OpenAI: GPT-4o-mini Search Preview	0.000000150	0.000000600	128000	t	2026-02-20 17:57:59.545334+00	2026-02-20 15:02:06.296593+00	2026-02-20 17:57:59.675809+00
openai/gpt-4o-search-preview	openai	OpenAI: GPT-4o Search Preview	0.000002500	0.000010000	128000	t	2026-02-20 17:57:59.546499+00	2026-02-20 15:02:06.296596+00	2026-02-20 17:57:59.67581+00
openai/gpt-4o:extended	openai	OpenAI: GPT-4o (extended)	0.000006000	0.000018000	128000	t	2026-02-20 17:57:59.621472+00	2026-02-20 15:02:06.296958+00	2026-02-20 17:57:59.675812+00
openai/gpt-5	openai	OpenAI: GPT-5	0.000001250	0.000010000	400000	t	2026-02-20 17:57:59.469618+00	2026-02-20 15:02:06.296325+00	2026-02-20 17:57:59.675813+00
openai/gpt-5-chat	openai	OpenAI: GPT-5 Chat	0.000001250	0.000010000	128000	t	2026-02-20 17:57:59.468996+00	2026-02-20 15:02:06.296322+00	2026-02-20 17:57:59.675814+00
openai/gpt-5-codex	openai	OpenAI: GPT-5 Codex	0.000001250	0.000010000	400000	t	2026-02-20 17:57:59.447177+00	2026-02-20 15:02:06.296226+00	2026-02-20 17:57:59.675816+00
openai/gpt-5-image	openai	OpenAI: GPT-5 Image	0.000010000	0.000010000	400000	t	2026-02-20 17:57:59.432149+00	2026-02-20 15:02:06.29613+00	2026-02-20 17:57:59.675817+00
openai/gpt-5-image-mini	openai	OpenAI: GPT-5 Image Mini	0.000002500	0.000002000	400000	t	2026-02-20 17:57:59.426159+00	2026-02-20 15:02:06.296114+00	2026-02-20 17:57:59.675818+00
openai/gpt-5-mini	openai	OpenAI: GPT-5 Mini	0.000000250	0.000002000	400000	t	2026-02-20 17:57:59.470164+00	2026-02-20 15:02:06.296328+00	2026-02-20 17:57:59.67582+00
openai/gpt-5-nano	openai	OpenAI: GPT-5 Nano	0.000000050	0.000000400	400000	t	2026-02-20 17:57:59.470706+00	2026-02-20 15:02:06.296331+00	2026-02-20 17:57:59.675821+00
openai/gpt-5-pro	openai	OpenAI: GPT-5 Pro	0.000015000	0.000120000	400000	t	2026-02-20 17:57:59.436675+00	2026-02-20 15:02:06.296174+00	2026-02-20 17:57:59.675823+00
openai/gpt-5.1	openai	OpenAI: GPT-5.1	0.000001250	0.000010000	400000	t	2026-02-20 17:57:59.411819+00	2026-02-20 15:02:06.296048+00	2026-02-20 17:57:59.675824+00
openai/gpt-5.1-chat	openai	OpenAI: GPT-5.1 Chat	0.000001250	0.000010000	128000	t	2026-02-20 17:57:59.412399+00	2026-02-20 15:02:06.296052+00	2026-02-20 17:57:59.675825+00
openai/gpt-5.1-codex	openai	OpenAI: GPT-5.1-Codex	0.000001250	0.000010000	400000	t	2026-02-20 17:57:59.413013+00	2026-02-20 15:02:06.296056+00	2026-02-20 17:57:59.675827+00
openai/gpt-5.1-codex-max	openai	OpenAI: GPT-5.1-Codex-Max	0.000001250	0.000010000	400000	t	2026-02-20 17:57:59.396017+00	2026-02-20 15:02:06.295941+00	2026-02-20 17:57:59.675829+00
openai/gpt-5.1-codex-mini	openai	OpenAI: GPT-5.1-Codex-Mini	0.000000250	0.000002000	400000	t	2026-02-20 17:57:59.413657+00	2026-02-20 15:02:06.296061+00	2026-02-20 17:57:59.675831+00
openai/gpt-5.2	openai	OpenAI: GPT-5.2	0.000001750	0.000014000	400000	t	2026-02-20 17:57:59.388668+00	2026-02-20 15:02:06.295914+00	2026-02-20 17:57:59.675833+00
openai/gpt-5.2-chat	openai	OpenAI: GPT-5.2 Chat	0.000001750	0.000014000	128000	t	2026-02-20 17:57:59.38712+00	2026-02-20 15:02:06.295906+00	2026-02-20 17:57:59.675839+00
openai/gpt-5.2-codex	openai	OpenAI: GPT-5.2-Codex	0.000001750	0.000014000	400000	t	2026-02-20 17:57:59.371787+00	2026-02-20 15:02:06.295862+00	2026-02-20 17:57:59.675841+00
openai/gpt-5.2-pro	openai	OpenAI: GPT-5.2 Pro	0.000021000	0.000168000	400000	t	2026-02-20 17:57:59.387812+00	2026-02-20 15:02:06.295911+00	2026-02-20 17:57:59.675843+00
openai/gpt-audio	openai	OpenAI: GPT Audio	0.000002500	0.000010000	128000	t	2026-02-20 17:57:59.369928+00	2026-02-20 15:02:06.295851+00	2026-02-20 17:57:59.675845+00
openai/gpt-audio-mini	openai	OpenAI: GPT Audio Mini	0.000000600	0.000002400	128000	t	2026-02-20 17:57:59.370513+00	2026-02-20 15:02:06.295854+00	2026-02-20 17:57:59.675847+00
openai/gpt-oss-120b	openai	OpenAI: gpt-oss-120b	0.000000039	0.000000190	131072	t	2026-02-20 17:57:59.471289+00	2026-02-20 15:02:06.29635+00	2026-02-20 17:57:59.675849+00
openai/gpt-oss-120b:exacto	openai	OpenAI: gpt-oss-120b (exacto)	0.000000039	0.000000190	131072	t	2026-02-20 17:57:59.471845+00	2026-02-20 15:02:06.296353+00	2026-02-20 17:57:59.675851+00
openai/gpt-oss-20b	openai	OpenAI: gpt-oss-20b	0.000000030	0.000000140	131072	t	2026-02-20 17:57:59.472373+00	2026-02-20 15:02:06.296356+00	2026-02-20 17:57:59.675853+00
openai/gpt-oss-safeguard-20b	openai	OpenAI: gpt-oss-safeguard-20b	0.000000075	0.000000300	131072	t	2026-02-20 17:57:59.421895+00	2026-02-20 15:02:06.296086+00	2026-02-20 17:57:59.675857+00
openai/o1	openai	OpenAI: o1	0.000015000	0.000060000	200000	t	2026-02-20 17:57:59.580444+00	2026-02-20 15:02:06.29673+00	2026-02-20 17:57:59.675862+00
openai/o1-pro	openai	OpenAI: o1-pro	0.000150000	0.000600000	200000	t	2026-02-20 17:57:59.535056+00	2026-02-20 15:02:06.296576+00	2026-02-20 17:57:59.675864+00
openai/o3	openai	OpenAI: o3	0.000002000	0.000008000	200000	t	2026-02-20 17:57:59.522254+00	2026-02-20 15:02:06.296535+00	2026-02-20 17:57:59.675866+00
openai/o3-deep-research	openai	OpenAI: o3 Deep Research	0.000010000	0.000040000	200000	t	2026-02-20 17:57:59.432897+00	2026-02-20 15:02:06.296134+00	2026-02-20 17:57:59.675868+00
openai/o3-mini	openai	OpenAI: o3 Mini	0.000001100	0.000004400	200000	t	2026-02-20 17:57:59.569127+00	2026-02-20 15:02:06.296688+00	2026-02-20 17:57:59.67587+00
openai/o3-mini-high	openai	OpenAI: o3 Mini High	0.000001100	0.000004400	200000	t	2026-02-20 17:57:59.557296+00	2026-02-20 15:02:06.296643+00	2026-02-20 17:57:59.675871+00
openai/o3-pro	openai	OpenAI: o3 Pro	0.000020000	0.000080000	200000	t	2026-02-20 17:57:59.501939+00	2026-02-20 15:02:06.296446+00	2026-02-20 17:57:59.675873+00
openai/o4-mini	openai	OpenAI: o4 Mini	0.000001100	0.000004400	200000	t	2026-02-20 17:57:59.522882+00	2026-02-20 15:02:06.296538+00	2026-02-20 17:57:59.675875+00
openai/o4-mini-deep-research	openai	OpenAI: o4 Mini Deep Research	0.000002000	0.000008000	200000	t	2026-02-20 17:57:59.433544+00	2026-02-20 15:02:06.296138+00	2026-02-20 17:57:59.675877+00
openai/o4-mini-high	openai	OpenAI: o4 Mini High	0.000001100	0.000004400	200000	t	2026-02-20 17:57:59.521654+00	2026-02-20 15:02:06.296533+00	2026-02-20 17:57:59.675879+00
opengvlab/internvl3-78b	opengvlab	OpenGVLab: InternVL3 78B	0.000000150	0.000000600	32768	t	2026-02-20 17:57:59.450809+00	2026-02-20 15:02:06.296251+00	2026-02-20 17:57:59.67588+00
openrouter/auto	openrouter	Auto Router	-1.000000000	-1.000000000	2000000	t	2026-02-20 17:57:59.634082+00	2026-02-20 15:02:06.297007+00	2026-02-20 17:57:59.675882+00
openrouter/bodybuilder	openrouter	Body Builder (beta)	-1.000000000	-1.000000000	128000	t	2026-02-20 17:57:59.395342+00	2026-02-20 15:02:06.295937+00	2026-02-20 17:57:59.675884+00
perplexity/sonar	perplexity	Perplexity: Sonar	0.000001000	0.000001000	127072	t	2026-02-20 17:57:59.571019+00	2026-02-20 15:02:06.2967+00	2026-02-20 17:57:59.675886+00
perplexity/sonar-deep-research	perplexity	Perplexity: Sonar Deep Research	0.000002000	0.000008000	128000	t	2026-02-20 17:57:59.550083+00	2026-02-20 15:02:06.29661+00	2026-02-20 17:57:59.675888+00
perplexity/sonar-pro	perplexity	Perplexity: Sonar Pro	0.000003000	0.000015000	200000	t	2026-02-20 17:57:59.549377+00	2026-02-20 15:02:06.296607+00	2026-02-20 17:57:59.67589+00
perplexity/sonar-pro-search	perplexity	Perplexity: Sonar Pro Search	0.000003000	0.000015000	200000	t	2026-02-20 17:57:59.420669+00	2026-02-20 15:02:06.296078+00	2026-02-20 17:57:59.675892+00
perplexity/sonar-reasoning-pro	perplexity	Perplexity: Sonar Reasoning Pro	0.000002000	0.000008000	128000	t	2026-02-20 17:57:59.54867+00	2026-02-20 15:02:06.296605+00	2026-02-20 17:57:59.675894+00
prime-intellect/intellect-3	prime-intellect	Prime Intellect: INTELLECT-3	0.000000200	0.000001100	131072	t	2026-02-20 17:57:59.404691+00	2026-02-20 15:02:06.296011+00	2026-02-20 17:57:59.675896+00
qwen/qwen-2.5-72b-instruct	qwen	Qwen2.5 72B Instruct	0.000000120	0.000000390	32768	t	2026-02-20 17:57:59.600769+00	2026-02-20 15:02:06.296862+00	2026-02-20 17:57:59.675898+00
qwen/qwen-2.5-7b-instruct	qwen	Qwen: Qwen2.5 7B Instruct	0.000000040	0.000000100	32768	t	2026-02-20 17:57:59.593736+00	2026-02-20 15:02:06.296813+00	2026-02-20 17:57:59.6759+00
qwen/qwen-2.5-coder-32b-instruct	qwen	Qwen2.5 Coder 32B Instruct	0.000000200	0.000000200	32768	t	2026-02-20 17:57:59.589252+00	2026-02-20 15:02:06.296788+00	2026-02-20 17:57:59.675901+00
qwen/qwen-2.5-vl-7b-instruct	qwen	Qwen: Qwen2.5-VL 7B Instruct	0.000000200	0.000000200	32768	t	2026-02-20 17:57:59.606076+00	2026-02-20 15:02:06.296882+00	2026-02-20 17:57:59.675903+00
qwen/qwen-max	qwen	Qwen: Qwen-Max 	0.000001600	0.000006400	32768	t	2026-02-20 17:57:59.567248+00	2026-02-20 15:02:06.296684+00	2026-02-20 17:57:59.675905+00
qwen/qwen-plus	qwen	Qwen: Qwen-Plus	0.000000400	0.000001200	1000000	t	2026-02-20 17:57:59.566607+00	2026-02-20 15:02:06.29668+00	2026-02-20 17:57:59.675907+00
qwen/qwen-plus-2025-07-28	qwen	Qwen: Qwen Plus 0728	0.000000400	0.000001200	1000000	t	2026-02-20 17:57:59.454687+00	2026-02-20 15:02:06.296268+00	2026-02-20 17:57:59.675909+00
qwen/qwen-plus-2025-07-28:thinking	qwen	Qwen: Qwen Plus 0728 (thinking)	0.000000400	0.000001200	1000000	t	2026-02-20 17:57:59.455324+00	2026-02-20 15:02:06.296272+00	2026-02-20 17:57:59.675911+00
qwen/qwen-turbo	qwen	Qwen: Qwen-Turbo	0.000000050	0.000000200	131072	t	2026-02-20 17:57:59.565211+00	2026-02-20 15:02:06.296672+00	2026-02-20 17:57:59.675913+00
qwen/qwen-vl-max	qwen	Qwen: Qwen VL Max	0.000000800	0.000003200	131072	t	2026-02-20 17:57:59.564486+00	2026-02-20 15:02:06.296668+00	2026-02-20 17:57:59.675915+00
qwen/qwen-vl-plus	qwen	Qwen: Qwen VL Plus	0.000000210	0.000000630	131072	t	2026-02-20 17:57:59.561105+00	2026-02-20 15:02:06.296651+00	2026-02-20 17:57:59.675917+00
qwen/qwen2.5-coder-7b-instruct	qwen	Qwen: Qwen2.5 Coder 7B Instruct	0.000000030	0.000000090	32768	t	2026-02-20 17:57:59.523504+00	2026-02-20 15:02:06.29654+00	2026-02-20 17:57:59.675918+00
qwen/qwen2.5-vl-32b-instruct	qwen	Qwen: Qwen2.5 VL 32B Instruct	0.000000200	0.000000600	128000	t	2026-02-20 17:57:59.533+00	2026-02-20 15:02:06.29657+00	2026-02-20 17:57:59.67592+00
qwen/qwen2.5-vl-72b-instruct	qwen	Qwen: Qwen2.5 VL 72B Instruct	0.000000250	0.000000750	32000	t	2026-02-20 17:57:59.565909+00	2026-02-20 15:02:06.296676+00	2026-02-20 17:57:59.675922+00
qwen/qwen3-14b	qwen	Qwen: Qwen3 14B	0.000000060	0.000000240	40960	t	2026-02-20 17:57:59.516391+00	2026-02-20 15:02:06.296522+00	2026-02-20 17:57:59.675924+00
qwen/qwen3-235b-a22b	qwen	Qwen: Qwen3 235B A22B	0.000000455	0.000001820	131072	t	2026-02-20 17:57:59.521055+00	2026-02-20 15:02:06.29653+00	2026-02-20 17:57:59.675926+00
qwen/qwen3-235b-a22b-2507	qwen	Qwen: Qwen3 235B A22B Instruct 2507	0.000000071	0.000000100	262144	t	2026-02-20 17:57:59.487055+00	2026-02-20 15:02:06.29639+00	2026-02-20 17:57:59.675927+00
qwen/qwen3-30b-a3b	qwen	Qwen: Qwen3 30B A3B	0.000000080	0.000000280	40960	t	2026-02-20 17:57:59.515203+00	2026-02-20 15:02:06.296515+00	2026-02-20 17:57:59.67593+00
qwen/qwen3-30b-a3b-instruct-2507	qwen	Qwen: Qwen3 30B A3B Instruct 2507	0.000000090	0.000000300	262144	t	2026-02-20 17:57:59.479617+00	2026-02-20 15:02:06.296367+00	2026-02-20 17:57:59.675932+00
qwen/qwen3-30b-a3b-thinking-2507	qwen	Qwen: Qwen3 30B A3B Thinking 2507	0.000000051	0.000000340	32768	t	2026-02-20 17:57:59.459598+00	2026-02-20 15:02:06.296289+00	2026-02-20 17:57:59.675934+00
qwen/qwen3-32b	qwen	Qwen: Qwen3 32B	0.000000080	0.000000240	40960	t	2026-02-20 17:57:59.520143+00	2026-02-20 15:02:06.296526+00	2026-02-20 17:57:59.675936+00
qwen/qwen3-8b	qwen	Qwen: Qwen3 8B	0.000000050	0.000000400	32000	t	2026-02-20 17:57:59.515803+00	2026-02-20 15:02:06.296519+00	2026-02-20 17:57:59.675938+00
qwen/qwen3-coder	qwen	Qwen: Qwen3 Coder 480B A35B	0.000000220	0.000001000	262144	t	2026-02-20 17:57:59.482371+00	2026-02-20 15:02:06.296378+00	2026-02-20 17:57:59.675939+00
qwen/qwen3-coder-30b-a3b-instruct	qwen	Qwen: Qwen3 Coder 30B A3B Instruct	0.000000070	0.000000270	160000	t	2026-02-20 17:57:59.47849+00	2026-02-20 15:02:06.296364+00	2026-02-20 17:57:59.675941+00
qwen/qwen3-coder-flash	qwen	Qwen: Qwen3 Coder Flash	0.000000300	0.000001500	1000000	t	2026-02-20 17:57:59.450271+00	2026-02-20 15:02:06.296247+00	2026-02-20 17:57:59.675943+00
qwen/qwen3-coder-next	qwen	Qwen: Qwen3 Coder Next	0.000000120	0.000000750	262144	t	2026-02-20 17:57:59.364244+00	2026-02-20 15:02:06.295833+00	2026-02-20 17:57:59.675945+00
qwen/qwen3-coder-plus	qwen	Qwen: Qwen3 Coder Plus	0.000001000	0.000005000	1000000	t	2026-02-20 17:57:59.446621+00	2026-02-20 15:02:06.296221+00	2026-02-20 17:57:59.675947+00
qwen/qwen3-coder:exacto	qwen	Qwen: Qwen3 Coder 480B A35B (exacto)	0.000000220	0.000001800	262144	t	2026-02-20 17:57:59.483046+00	2026-02-20 15:02:06.296381+00	2026-02-20 17:57:59.675949+00
qwen/qwen3-max	qwen	Qwen: Qwen3 Max	0.000001200	0.000006000	262144	t	2026-02-20 17:57:59.446073+00	2026-02-20 15:02:06.296217+00	2026-02-20 17:57:59.67595+00
qwen/qwen3-max-thinking	qwen	Qwen: Qwen3 Max Thinking	0.000001200	0.000006000	262144	t	2026-02-20 17:57:59.362628+00	2026-02-20 15:02:06.295825+00	2026-02-20 17:57:59.675952+00
qwen/qwen3-next-80b-a3b-instruct	qwen	Qwen: Qwen3 Next 80B A3B Instruct	0.000000090	0.000001100	262144	t	2026-02-20 17:57:59.453566+00	2026-02-20 15:02:06.29626+00	2026-02-20 17:57:59.675954+00
qwen/qwen3-next-80b-a3b-thinking	qwen	Qwen: Qwen3 Next 80B A3B Thinking	0.000000150	0.000001200	128000	t	2026-02-20 17:57:59.452976+00	2026-02-20 15:02:06.296256+00	2026-02-20 17:57:59.675956+00
qwen/qwen3-vl-235b-a22b-instruct	qwen	Qwen: Qwen3 VL 235B A22B Instruct	0.000000200	0.000000880	262144	t	2026-02-20 17:57:59.445549+00	2026-02-20 15:02:06.296213+00	2026-02-20 17:57:59.675958+00
qwen/qwen3-vl-30b-a3b-instruct	qwen	Qwen: Qwen3 VL 30B A3B Instruct	0.000000130	0.000000520	131072	t	2026-02-20 17:57:59.436022+00	2026-02-20 15:02:06.296169+00	2026-02-20 17:57:59.67596+00
qwen/qwen3-vl-32b-instruct	qwen	Qwen: Qwen3 VL 32B Instruct	0.000000104	0.000000416	131072	t	2026-02-20 17:57:59.423842+00	2026-02-20 15:02:06.296098+00	2026-02-20 17:57:59.675962+00
qwen/qwen3-vl-8b-instruct	qwen	Qwen: Qwen3 VL 8B Instruct	0.000000080	0.000000500	131072	t	2026-02-20 17:57:59.430221+00	2026-02-20 15:02:06.296126+00	2026-02-20 17:57:59.675963+00
qwen/qwen3-vl-8b-thinking	qwen	Qwen: Qwen3 VL 8B Thinking	0.000000117	0.000001365	131072	t	2026-02-20 17:57:59.429208+00	2026-02-20 15:02:06.296122+00	2026-02-20 17:57:59.675965+00
qwen/qwen3.5-397b-a17b	qwen	Qwen: Qwen3.5 397B A17B	0.000000150	0.000001000	262144	t	2026-02-20 17:57:59.358498+00	2026-02-20 15:02:06.295814+00	2026-02-20 17:57:59.675967+00
qwen/qwen3.5-plus-02-15	qwen	Qwen: Qwen3.5 Plus 2026-02-15	0.000000400	0.000002400	1000000	t	2026-02-20 17:57:59.356912+00	2026-02-20 15:02:06.29581+00	2026-02-20 17:57:59.675969+00
qwen/qwq-32b	qwen	Qwen: QwQ 32B	0.000000150	0.000000400	32768	t	2026-02-20 17:57:59.550783+00	2026-02-20 15:02:06.296613+00	2026-02-20 17:57:59.675971+00
raifle/sorcererlm-8x22b	raifle	SorcererLM 8x22B	0.000004500	0.000004500	16000	t	2026-02-20 17:57:59.589826+00	2026-02-20 15:02:06.296792+00	2026-02-20 17:57:59.675973+00
relace/relace-apply-3	relace	Relace: Relace Apply 3	0.000000850	0.000001250	256000	t	2026-02-20 17:57:59.444439+00	2026-02-20 15:02:06.2962+00	2026-02-20 17:57:59.675975+00
relace/relace-search	relace	Relace: Relace Search	0.000001000	0.000003000	256000	t	2026-02-20 17:57:59.392759+00	2026-02-20 15:02:06.295922+00	2026-02-20 17:57:59.675977+00
sao10k/l3-euryale-70b	sao10k	Sao10k: Llama 3 Euryale 70B v2.1	0.000001480	0.000001480	8192	t	2026-02-20 17:57:59.617405+00	2026-02-20 15:02:06.296937+00	2026-02-20 17:57:59.675978+00
sao10k/l3-lunaris-8b	sao10k	Sao10K: Llama 3 8B Lunaris	0.000000040	0.000000050	8192	t	2026-02-20 17:57:59.608487+00	2026-02-20 15:02:06.296894+00	2026-02-20 17:57:59.67598+00
sao10k/l3.1-70b-hanami-x1	sao10k	Sao10K: Llama 3.1 70B Hanami x1	0.000003000	0.000003000	16000	t	2026-02-20 17:57:59.576602+00	2026-02-20 15:02:06.296719+00	2026-02-20 17:57:59.675982+00
sao10k/l3.1-euryale-70b	sao10k	Sao10K: Llama 3.1 Euryale 70B v2.2	0.000000650	0.000000750	32768	t	2026-02-20 17:57:59.605435+00	2026-02-20 15:02:06.296878+00	2026-02-20 17:57:59.675984+00
sao10k/l3.3-euryale-70b	sao10k	Sao10K: Llama 3.3 Euryale 70B	0.000000650	0.000000750	131072	t	2026-02-20 17:57:59.579897+00	2026-02-20 15:02:06.296726+00	2026-02-20 17:57:59.675986+00
stepfun/step-3.5-flash	stepfun	StepFun: Step 3.5 Flash	0.000000100	0.000000300	256000	t	2026-02-20 17:57:59.366166+00	2026-02-20 15:02:06.295837+00	2026-02-20 17:57:59.675988+00
switchpoint/router	switchpoint	Switchpoint Router	0.000000850	0.000003400	131072	t	2026-02-20 17:57:59.487846+00	2026-02-20 15:02:06.296392+00	2026-02-20 17:57:59.67599+00
tencent/hunyuan-a13b-instruct	tencent	Tencent: Hunyuan A13B Instruct	0.000000140	0.000000570	131072	t	2026-02-20 17:57:59.490811+00	2026-02-20 15:02:06.296405+00	2026-02-20 17:57:59.675992+00
thedrummer/cydonia-24b-v4.1	thedrummer	TheDrummer: Cydonia 24B V4.1	0.000000300	0.000000500	131072	t	2026-02-20 17:57:59.443894+00	2026-02-20 15:02:06.296194+00	2026-02-20 17:57:59.675994+00
thedrummer/rocinante-12b	thedrummer	TheDrummer: Rocinante 12B	0.000000170	0.000000430	32768	t	2026-02-20 17:57:59.598145+00	2026-02-20 15:02:06.296845+00	2026-02-20 17:57:59.675995+00
thedrummer/skyfall-36b-v2	thedrummer	TheDrummer: Skyfall 36B V2	0.000000550	0.000000800	32768	t	2026-02-20 17:57:59.548016+00	2026-02-20 15:02:06.296602+00	2026-02-20 17:57:59.675996+00
thedrummer/unslopnemo-12b	thedrummer	TheDrummer: UnslopNemo 12B	0.000000400	0.000000400	32768	t	2026-02-20 17:57:59.590507+00	2026-02-20 15:02:06.296797+00	2026-02-20 17:57:59.675998+00
tngtech/deepseek-r1t2-chimera	tngtech	TNG: DeepSeek R1T2 Chimera	0.000000250	0.000000850	163840	t	2026-02-20 17:57:59.492328+00	2026-02-20 15:02:06.296408+00	2026-02-20 17:57:59.675999+00
undi95/remm-slerp-l2-13b	undi95	ReMM SLERP 13B	0.000000450	0.000000650	6144	t	2026-02-20 17:57:59.641087+00	2026-02-20 15:02:06.297035+00	2026-02-20 17:57:59.676+00
writer/palmyra-x5	writer	Writer: Palmyra X5	0.000000600	0.000006000	1040000	t	2026-02-20 17:57:59.369174+00	2026-02-20 15:02:06.295847+00	2026-02-20 17:57:59.676008+00
x-ai/grok-3	x-ai	xAI: Grok 3	0.000003000	0.000015000	131072	t	2026-02-20 17:57:59.503167+00	2026-02-20 15:02:06.296451+00	2026-02-20 17:57:59.676009+00
x-ai/grok-3-beta	x-ai	xAI: Grok 3 Beta	0.000003000	0.000015000	131072	t	2026-02-20 17:57:59.529662+00	2026-02-20 15:02:06.296559+00	2026-02-20 17:57:59.67601+00
x-ai/grok-3-mini	x-ai	xAI: Grok 3 Mini	0.000000300	0.000000500	131072	t	2026-02-20 17:57:59.502576+00	2026-02-20 15:02:06.296449+00	2026-02-20 17:57:59.676012+00
x-ai/grok-3-mini-beta	x-ai	xAI: Grok 3 Mini Beta	0.000000300	0.000000500	131072	t	2026-02-20 17:57:59.529124+00	2026-02-20 15:02:06.296556+00	2026-02-20 17:57:59.676013+00
x-ai/grok-4	x-ai	xAI: Grok 4	0.000003000	0.000015000	256000	t	2026-02-20 17:57:59.490074+00	2026-02-20 15:02:06.296402+00	2026-02-20 17:57:59.676014+00
x-ai/grok-4-fast	x-ai	xAI: Grok 4 Fast	0.000000200	0.000000500	2000000	t	2026-02-20 17:57:59.448987+00	2026-02-20 15:02:06.296239+00	2026-02-20 17:57:59.676016+00
x-ai/grok-4.1-fast	x-ai	xAI: Grok 4.1 Fast	0.000000200	0.000000500	2000000	t	2026-02-20 17:57:59.410073+00	2026-02-20 15:02:06.296035+00	2026-02-20 17:57:59.676017+00
x-ai/grok-code-fast-1	x-ai	xAI: Grok Code Fast 1	0.000000200	0.000001500	256000	t	2026-02-20 17:57:59.460131+00	2026-02-20 15:02:06.296293+00	2026-02-20 17:57:59.676018+00
xiaomi/mimo-v2-flash	xiaomi	Xiaomi: MiMo-V2-Flash	0.000000090	0.000000290	262144	t	2026-02-20 17:57:59.382893+00	2026-02-20 15:02:06.295898+00	2026-02-20 17:57:59.676019+00
z-ai/glm-4-32b	z-ai	Z.ai: GLM 4 32B 	0.000000100	0.000000100	128000	t	2026-02-20 17:57:59.481635+00	2026-02-20 15:02:06.296375+00	2026-02-20 17:57:59.676021+00
z-ai/glm-4.5	z-ai	Z.ai: GLM 4.5	0.000000550	0.000002000	131000	t	2026-02-20 17:57:59.480355+00	2026-02-20 15:02:06.29637+00	2026-02-20 17:57:59.676022+00
z-ai/glm-4.5-air	z-ai	Z.ai: GLM 4.5 Air	0.000000130	0.000000850	131072	t	2026-02-20 17:57:59.481038+00	2026-02-20 15:02:06.296373+00	2026-02-20 17:57:59.676023+00
z-ai/glm-4.5v	z-ai	Z.ai: GLM 4.5V	0.000000600	0.000001800	65536	t	2026-02-20 17:57:59.465775+00	2026-02-20 15:02:06.296317+00	2026-02-20 17:57:59.676025+00
z-ai/glm-4.6	z-ai	Z.ai: GLM 4.6	0.000000350	0.000001710	202752	t	2026-02-20 17:57:59.437346+00	2026-02-20 15:02:06.296177+00	2026-02-20 17:57:59.676026+00
z-ai/glm-4.6:exacto	z-ai	Z.ai: GLM 4.6 (exacto)	0.000000440	0.000001760	204800	t	2026-02-20 17:57:59.439893+00	2026-02-20 15:02:06.296181+00	2026-02-20 17:57:59.676027+00
z-ai/glm-4.6v	z-ai	Z.ai: GLM 4.6V	0.000000300	0.000000900	131072	t	2026-02-20 17:57:59.393432+00	2026-02-20 15:02:06.295926+00	2026-02-20 17:57:59.676029+00
z-ai/glm-4.7	z-ai	Z.ai: GLM 4.7	0.000000380	0.000001700	202752	t	2026-02-20 17:57:59.379999+00	2026-02-20 15:02:06.295884+00	2026-02-20 17:57:59.67603+00
z-ai/glm-4.7-flash	z-ai	Z.ai: GLM 4.7 Flash	0.000000060	0.000000400	202752	t	2026-02-20 17:57:59.371164+00	2026-02-20 15:02:06.295858+00	2026-02-20 17:57:59.676031+00
z-ai/glm-5	z-ai	Z.ai: GLM 5	0.000000300	0.000002550	204800	t	2026-02-20 17:57:59.36186+00	2026-02-20 15:02:06.295821+00	2026-02-20 17:57:59.676033+00
\.


--
-- Data for Name: referral_clicks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.referral_clicks (id, referral_code, clicked_by_ip, clicked_at, converted, converted_user_id) FROM stdin;
\.


--
-- Data for Name: request_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.request_logs (id, user_id, api_key_id, master_account_id, model, endpoint, method, prompt_tokens, completion_tokens, total_tokens, cost_to_us_usd, cost_to_client_usd, profit_usd, duration_ms, status_code, status, error_message, created_at, openrouter_cost_usd, account_type_used) FROM stdin;
5bead0a7-b378-4384-abe3-4679bde34bc8	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	0	0	0	0.000000	0.000000	0.000000	37581	\N	error	Expecting value: line 153 column 1 (char 836)	2026-02-20 19:08:27.403189+00	0.000000	\N
2ba732d1-13b6-48a2-bc65-76a9a70ebc1d	ca294741-3b10-4953-a3cf-43c1faaba9c0	4c416fe7-4faa-481a-ab4e-60cf360a64cf	\N	gpt-4o-mini	/chat/completions	POST	4953	50	5003	0.026000	0.028000	0.003000	3041	200	success	\N	2026-02-18 10:26:46.061488+00	0.026000	\N
26df55dc-4180-429c-838d-2497bd53bbac	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	53	68	121	0.000015	0.000039	0.000024	2134	200	success	\N	2026-02-20 18:45:29.663527+00	0.000049	\N
0d173d8f-d6d8-43a2-b0a7-8b3d3dac761b	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	96	1433	1529	0.041400	0.110400	0.069000	23761	200	success	\N	2026-02-20 13:20:06.950822+00	0.138000	\N
1ca7ffed-2a5c-44fd-aaf2-14a333d18c86	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	76	302	378	0.041400	0.110400	0.069000	20507	200	success	\N	2026-02-20 13:07:00.882347+00	0.138000	\N
1cadbe21-3642-4264-851b-f6e1ecba5624	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	79	244	323	0.041400	0.110400	0.069000	13722	200	success	\N	2026-02-20 13:14:39.77325+00	0.138000	\N
21ff9a7f-301a-420f-999a-d365ca4d9084	ca294741-3b10-4953-a3cf-43c1faaba9c0	9df673df-8726-4b9b-aeda-3ff167fa0967	\N	google/gemini-2.5-flash-image	/chat/completions	POST	8	7	15	0.000006	0.000016	0.000010	875	200	success	\N	2026-02-21 05:19:28.922728+00	0.000020	\N
3275dc7d-cc8e-444f-b057-fe9cbe4f1a7b	ca294741-3b10-4953-a3cf-43c1faaba9c0	9df673df-8726-4b9b-aeda-3ff167fa0967	\N	openai/gpt-4o-mini	/chat/completions	POST	12	3	15	0.000001	0.000003	0.000002	903	200	success	\N	2026-02-21 05:05:56.340727+00	0.000004	\N
3809050d-add8-4fab-b54c-7e3e9ffcf08b	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	109	190	299	0.041400	0.110400	0.069000	19531	200	success	\N	2026-02-20 13:11:47.804465+00	0.138000	\N
3856b37e-fb49-4916-80b6-cd32eeaf8284	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	81	1452	1533	0.005276	0.014069	0.008793	26357	200	success	\N	2026-02-20 18:45:56.201835+00	0.017586	\N
38883396-637d-49d5-a5b1-c8d24f7ae0c0	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	95	1463	1558	0.005324	0.014197	0.008873	31256	200	success	\N	2026-02-20 18:39:35.621679+00	0.017746	\N
412d0eeb-b836-4853-b7b5-15d34b265817	ca294741-3b10-4953-a3cf-43c1faaba9c0	9df673df-8726-4b9b-aeda-3ff167fa0967	\N	openai/gpt-4o-mini	/chat/completions	POST	12	8	20	0.000002	0.000005	0.000003	1515	200	success	\N	2026-02-21 05:06:29.407346+00	0.000007	\N
484a257f-d0c5-4365-93b4-7a9fa8f0a6ca	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	55	82	137	0.000000	0.001000	0.001000	2775	200	success	\N	2026-02-20 12:40:23.831832+00	0.002000	\N
4c5b65c9-5b91-46be-af5c-804ba8ada2c3	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	53	85	138	0.000018	0.000047	0.000029	2315	200	success	\N	2026-02-20 18:39:04.279867+00	0.000059	\N
4cbe2714-f022-45cc-8b30-0b21f1cacccb	ca294741-3b10-4953-a3cf-43c1faaba9c0	9df673df-8726-4b9b-aeda-3ff167fa0967	\N	openai/gpt-4o-mini	/chat/completions	POST	12	8	20	0.000002	0.000005	0.000003	1024	200	success	\N	2026-02-21 05:31:14.197256+00	0.000007	discounted
4f2ececd-c79d-44ed-b641-948da8bbffca	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	53	63	116	0.000000	0.001000	0.001000	1900	200	success	\N	2026-02-20 13:06:40.271719+00	0.001000	\N
50039433-a652-453b-849c-8721495f33bb	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	51	84	135	0.000000	0.001000	0.001000	1956	200	success	\N	2026-02-20 13:19:43.054847+00	0.002000	\N
5999bc4a-03a9-4d80-8677-b3d372236737	ca294741-3b10-4953-a3cf-43c1faaba9c0	9df673df-8726-4b9b-aeda-3ff167fa0967	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	7	303	310	0.001095	0.002920	0.001825	7728	200	success	\N	2026-02-21 05:19:40.227853+00	0.003650	\N
5edc6a31-a151-4029-8f62-223c60f7dad2	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	53	67	120	0.000000	0.001000	0.001000	2886	200	success	\N	2026-02-20 13:04:34.353802+00	0.001000	\N
60159833-35d8-479c-b54c-893dd68dedb0	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	51	68	119	0.000000	0.001000	0.001000	2358	200	success	\N	2026-02-20 13:14:25.890981+00	0.001000	\N
618499a8-eae5-46fa-9456-e2761bcc054a	ca294741-3b10-4953-a3cf-43c1faaba9c0	9df673df-8726-4b9b-aeda-3ff167fa0967	\N	openai/gpt-4o-mini	/chat/completions	POST	12	8	20	0.000007	0.000005	-0.000001	1061	200	success	\N	2026-02-21 05:30:24.971584+00	0.000007	discounted
6447aa83-8be5-48d0-b375-1b75dc9ed183	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-2.0-flash-exp-image-generation	/chat/completions	POST	0	0	0	0.000000	0.000000	0.000000	275	400	error	\N	2026-02-20 13:04:34.689235+00	0.000000	\N
6a27267f-3e49-4cfa-b7fd-09eb55905e7b	ca294741-3b10-4953-a3cf-43c1faaba9c0	1dc4fbb7-d3d8-4ebb-b391-ae6102dc753d	\N	openai/gpt-4o-mini	/chat/completions	POST	11	100	111	0.000018	0.000049	0.000031	2550	200	success	\N	2026-02-21 08:16:35.570288+00	0.000062	discounted
7ba042aa-177f-44a0-abc9-1b551f83d948	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	94	250	344	0.041400	0.110400	0.069000	15686	200	success	\N	2026-02-20 13:17:29.404215+00	0.138000	\N
8c67bc7a-389f-4ac4-8540-832a410d79e8	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	51	90	141	0.000018	0.000049	0.000031	2405	200	success	\N	2026-02-20 19:07:49.714958+00	0.000062	\N
93217ffb-61d4-4fa5-b4c2-d9a9f09cac96	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	51	80	131	0.000000	0.001000	0.001000	2874	200	success	\N	2026-02-20 13:17:13.592445+00	0.001000	\N
95de19d9-beb4-450e-a544-3054e99527ef	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	9	1372	1381	0.041400	0.110400	0.069000	26273	200	success	\N	2026-02-20 12:59:14.147266+00	0.138000	\N
a3f7c435-34cd-4e90-9bca-3a02884186b0	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	59	82	141	0.000000	0.001000	0.001000	2205	200	success	\N	2026-02-20 12:35:37.996605+00	0.002000	\N
aa3b944e-b78a-49e4-9268-4cfabb33fe04	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	53	98	151	0.001000	0.001000	0.001000	3284	200	success	\N	2026-02-20 13:11:28.188523+00	0.002000	\N
c56e817f-47dd-41b3-8177-bc6226bde8a1	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	50	77	127	0.000000	0.001000	0.001000	2406	200	success	\N	2026-02-20 12:40:53.720696+00	0.001000	\N
c80c73a8-cad3-4346-8d4b-2d65b25abedf	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	53	82	135	0.000000	0.001000	0.001000	2782	200	success	\N	2026-02-20 13:02:29.67159+00	0.001000	\N
ce248d66-7b94-4a0e-baa2-21e078ef6841	ca294741-3b10-4953-a3cf-43c1faaba9c0	9df673df-8726-4b9b-aeda-3ff167fa0967	\N	anthropic/claude-3-haiku	/chat/completions	POST	12	4	16	0.000002	0.000006	0.000004	857	200	success	\N	2026-02-21 05:07:04.966887+00	0.000008	\N
d4608cd5-dd73-4cb6-8e87-70399f012da9	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	gpt-4o-mini	/chat/completions	POST	8	9	17	0.000000	0.000000	0.000000	989	200	success	\N	2026-02-20 12:51:21.977078+00	0.000000	\N
d4abe1eb-32c2-4fec-9a26-27b53df91706	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	sdxl	/chat/completions	POST	0	0	0	0.000000	0.000000	0.000000	296	400	error	\N	2026-02-20 13:02:30.066102+00	0.000000	\N
dd548896-c500-4d62-a4a3-f98797cb167d	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	6	1327	1333	0.004781	0.012749	0.007968	22951	200	success	\N	2026-02-20 18:40:57.471732+00	0.015936	\N
ed8b7636-84c5-4f62-a91d-a7d0505a051b	ca294741-3b10-4953-a3cf-43c1faaba9c0	9df673df-8726-4b9b-aeda-3ff167fa0967	\N	openai/gpt-4o-mini	/chat/completions	POST	11	2	13	0.000001	0.000002	0.000001	1433	200	success	\N	2026-02-21 05:07:03.065344+00	0.000003	\N
f729b6ab-12c5-4b6e-acab-2669c0f8f582	ca294741-3b10-4953-a3cf-43c1faaba9c0	ede7815d-2192-4d09-9b76-fcfd635210ae	\N	google/gemini-3-pro-image-preview	/chat/completions	POST	7	143	150	0.000519	0.001384	0.000865	15421	200	success	\N	2026-02-20 18:40:22.834839+00	0.001730	\N
fff1e1ec-229a-4154-a032-aa5596f9a855	ca294741-3b10-4953-a3cf-43c1faaba9c0	1dc4fbb7-d3d8-4ebb-b391-ae6102dc753d	\N	openai/gpt-4o-mini	/chat/completions	POST	8	10	18	0.000002	0.000006	0.000004	1117	200	success	\N	2026-02-21 08:43:04.983941+00	0.000007	discounted
e314ac3c-2bfb-483f-81f0-7051199ea653	ca294741-3b10-4953-a3cf-43c1faaba9c0	1dc4fbb7-d3d8-4ebb-b391-ae6102dc753d	0674950a-3636-40ae-94e2-9e1aa6bba8a2	openai/gpt-4o-mini	/chat/completions	POST	9	10	19	0.000002	0.000006	0.000004	962	200	success	\N	2026-02-21 08:47:15.571856+00	0.000007	discounted
\.


--
-- Data for Name: support_operators; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_operators (telegram_id, username, name, is_active, notify_on_priority, created_at) FROM stdin;
\.


--
-- Data for Name: support_ticket_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_ticket_comments (id, ticket_id, author_type, author_id, author_username, message, is_internal, created_at) FROM stdin;
\.


--
-- Data for Name: support_tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_tickets (id, user_id, telegram_id, telegram_username, category, priority, status, title, description, api_key_id, related_request_id, screenshots, assigned_to, created_at, updated_at, resolved_at) FROM stdin;
\.


--
-- Data for Name: telegram_bindings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.telegram_bindings (telegram_id, user_id, username, api_key_hash, created_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, name, role, status, email_verified, email_verified_at, created_at, updated_at, force_password_change, referrer_id, referral_code, referral_bonus_claimed) FROM stdin;
1978b659-c31f-49eb-ae97-2509a5ecc08c	regular@ai-router.com	$2b$12$v/aV3i.oNmoK8JAni2oJW.DfY/HP3/jkawm4bCrE2E5r.qgMWOOeO	Regular User	client	active	f	\N	2026-02-13 12:24:41.662227+00	2026-02-13 12:24:41.662234+00	f	\N	\N	f
4e2a25eb-9d39-4838-aee2-8003cd3126f3	superuser@ai-router.com	$2b$12$CB0ErHXkKcUkfna8sIS7t.B2gXK8CIcbGdpH0kotPfNh1ReYXf0Ku	Super User	admin	active	f	\N	2026-02-13 12:24:35.497233+00	2026-02-13 12:24:35.497242+00	f	\N	\N	f
ca294741-3b10-4953-a3cf-43c1faaba9c0	test@test.ru	$2b$12$NxbNSBXD.XcwLuEAM4kjOuBJZNU/w4dqihnjM9nSXMW6Gnjm52vYG	Test User	client	active	t	\N	2026-02-18 04:49:16.977109+00	2026-02-18 04:49:16.977118+00	f	\N	\N	f
0d3714b7-3d9d-4426-a50b-b219f6439885	teodor775teodor@gmail.com	$2b$12$6WB3j2sMedXtAVYgLEuK0eVt2eo237wpXrxdX/okN4F7znK1rk8ku	Teodor	admin	active	t	\N	2026-02-18 04:50:52.763492+00	2026-02-18 04:50:52.763501+00	f	\N	\N	f
d2057877-acb6-4b28-8f0a-c59fdee07f47	investor@test.com	$2b$12$ZXrOemOwHR1qxu0WtvdfFeNBvtZUlj346coMp7TrrOcKadawojfe6	Test Investor	investor	active	t	\N	2026-02-18 07:42:32.039529+00	2026-02-18 07:42:32.056217+00	f	\N	ARO1ILL0	f
a94e6941-4159-426f-9172-12c10c9a1a61	Arondrotsild@gmail.com	$2b$12$nH4IpQSAdArwtrndlUDhw.J3/EIpyNhTNUx3Fk7ijuKOzSJwwyX46	Arond	client	active	t	\N	2026-02-18 08:44:53.053695+00	2026-02-18 08:44:53.053702+00	f	\N	\N	f
d3589c53-534e-4040-be5f-0359515b4287	kentkouh+gcsy2@gmail.com	$2b$12$WaHJvIkMywhacPP0S4T/r.7dGVSDwI6M.CrDZoTB0APErFKKWRmHS	\N	client	active	t	\N	2026-02-18 17:40:56.379908+00	2026-02-18 17:40:56.379917+00	f	\N	\N	f
0f972f6b-8682-4037-a628-2eae88fc1d41	f73651968@gmail.com	$2b$12$OO0KrjcmBNwRBj4gCWk8QOT38.iXpUMTAxKWscKcThp7h0DaJ5Z9u	Hoodrich	admin	active	t	\N	2026-02-20 08:39:06.984209+00	2026-02-20 12:21:39.58944+00	f	\N	\N	f
\.


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: balances balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_pkey PRIMARY KEY (user_id);


--
-- Name: deposits deposits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_pkey PRIMARY KEY (id);


--
-- Name: investor_accounts investor_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_accounts
    ADD CONSTRAINT investor_accounts_pkey PRIMARY KEY (id);


--
-- Name: investor_payouts investor_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_payouts
    ADD CONSTRAINT investor_payouts_pkey PRIMARY KEY (id);


--
-- Name: investor_referral_earnings investor_referral_earnings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_referral_earnings
    ADD CONSTRAINT investor_referral_earnings_pkey PRIMARY KEY (id);


--
-- Name: investor_request_logs investor_request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_request_logs
    ADD CONSTRAINT investor_request_logs_pkey PRIMARY KEY (id);


--
-- Name: master_accounts master_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_accounts
    ADD CONSTRAINT master_accounts_pkey PRIMARY KEY (id);


--
-- Name: model_pricing model_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.model_pricing
    ADD CONSTRAINT model_pricing_pkey PRIMARY KEY (id);


--
-- Name: referral_clicks referral_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_clicks
    ADD CONSTRAINT referral_clicks_pkey PRIMARY KEY (id);


--
-- Name: request_logs request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_logs
    ADD CONSTRAINT request_logs_pkey PRIMARY KEY (id);


--
-- Name: support_operators support_operators_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_operators
    ADD CONSTRAINT support_operators_pkey PRIMARY KEY (telegram_id);


--
-- Name: support_ticket_comments support_ticket_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_comments
    ADD CONSTRAINT support_ticket_comments_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: telegram_bindings telegram_bindings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bindings
    ADD CONSTRAINT telegram_bindings_pkey PRIMARY KEY (telegram_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (is_active);


--
-- Name: idx_api_keys_key_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- Name: idx_balances_balance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balances_balance ON public.balances USING btree (balance_usd);


--
-- Name: idx_deposits_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deposits_created_at ON public.deposits USING btree (created_at);


--
-- Name: idx_deposits_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deposits_status ON public.deposits USING btree (status);


--
-- Name: idx_deposits_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deposits_user_id ON public.deposits USING btree (user_id);


--
-- Name: idx_investor_accounts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_investor_accounts_status ON public.investor_accounts USING btree (status);


--
-- Name: idx_investor_accounts_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_investor_accounts_user_id ON public.investor_accounts USING btree (user_id);


--
-- Name: idx_investor_logs_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_investor_logs_account_id ON public.investor_request_logs USING btree (investor_account_id);


--
-- Name: idx_investor_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_investor_logs_created_at ON public.investor_request_logs USING btree (created_at);


--
-- Name: idx_investor_logs_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_investor_logs_model ON public.investor_request_logs USING btree (model);


--
-- Name: idx_investor_payouts_account_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_investor_payouts_account_id ON public.investor_payouts USING btree (investor_account_id);


--
-- Name: idx_investor_ref_earnings_investor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_investor_ref_earnings_investor ON public.investor_referral_earnings USING btree (investor_id);


--
-- Name: idx_investor_ref_earnings_referral; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_investor_ref_earnings_referral ON public.investor_referral_earnings USING btree (referral_id);


--
-- Name: idx_master_accounts_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_accounts_active ON public.master_accounts USING btree (is_active);


--
-- Name: idx_master_accounts_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_master_accounts_priority ON public.master_accounts USING btree (priority);


--
-- Name: idx_model_pricing_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_model_pricing_active ON public.model_pricing USING btree (is_active);


--
-- Name: idx_model_pricing_provider; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_model_pricing_provider ON public.model_pricing USING btree (provider);


--
-- Name: idx_referral_clicks_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_clicks_code ON public.referral_clicks USING btree (referral_code);


--
-- Name: idx_referral_clicks_converted; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_referral_clicks_converted ON public.referral_clicks USING btree (converted);


--
-- Name: idx_request_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_logs_created_at ON public.request_logs USING btree (created_at);


--
-- Name: idx_request_logs_model; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_logs_model ON public.request_logs USING btree (model);


--
-- Name: idx_request_logs_model_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_logs_model_created ON public.request_logs USING btree (model, created_at);


--
-- Name: idx_request_logs_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_logs_status ON public.request_logs USING btree (status);


--
-- Name: idx_request_logs_user_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_logs_user_created ON public.request_logs USING btree (user_id, created_at);


--
-- Name: idx_request_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_logs_user_id ON public.request_logs USING btree (user_id);


--
-- Name: idx_support_comments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_comments_created_at ON public.support_ticket_comments USING btree (created_at);


--
-- Name: idx_support_comments_ticket_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_comments_ticket_id ON public.support_ticket_comments USING btree (ticket_id);


--
-- Name: idx_support_tickets_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_created_at ON public.support_tickets USING btree (created_at DESC);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status);


--
-- Name: idx_support_tickets_telegram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_telegram_id ON public.support_tickets USING btree (telegram_id);


--
-- Name: idx_support_tickets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets USING btree (user_id);


--
-- Name: idx_telegram_bindings_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_bindings_user_id ON public.telegram_bindings USING btree (user_id);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role_status ON public.users USING btree (role, status);


--
-- Name: support_tickets update_support_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: balances balances_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: deposits deposits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposits
    ADD CONSTRAINT deposits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: investor_accounts investor_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_accounts
    ADD CONSTRAINT investor_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: investor_payouts investor_payouts_investor_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_payouts
    ADD CONSTRAINT investor_payouts_investor_account_id_fkey FOREIGN KEY (investor_account_id) REFERENCES public.investor_accounts(id) ON DELETE CASCADE;


--
-- Name: investor_referral_earnings investor_referral_earnings_investor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_referral_earnings
    ADD CONSTRAINT investor_referral_earnings_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.users(id);


--
-- Name: investor_referral_earnings investor_referral_earnings_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_referral_earnings
    ADD CONSTRAINT investor_referral_earnings_referral_id_fkey FOREIGN KEY (referral_id) REFERENCES public.users(id);


--
-- Name: investor_referral_earnings investor_referral_earnings_request_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_referral_earnings
    ADD CONSTRAINT investor_referral_earnings_request_log_id_fkey FOREIGN KEY (request_log_id) REFERENCES public.request_logs(id);


--
-- Name: investor_request_logs investor_request_logs_investor_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.investor_request_logs
    ADD CONSTRAINT investor_request_logs_investor_account_id_fkey FOREIGN KEY (investor_account_id) REFERENCES public.investor_accounts(id);


--
-- Name: referral_clicks referral_clicks_converted_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_clicks
    ADD CONSTRAINT referral_clicks_converted_user_id_fkey FOREIGN KEY (converted_user_id) REFERENCES public.users(id);


--
-- Name: request_logs request_logs_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_logs
    ADD CONSTRAINT request_logs_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id);


--
-- Name: request_logs request_logs_master_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_logs
    ADD CONSTRAINT request_logs_master_account_id_fkey FOREIGN KEY (master_account_id) REFERENCES public.master_accounts(id);


--
-- Name: request_logs request_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.request_logs
    ADD CONSTRAINT request_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: support_ticket_comments support_ticket_comments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_ticket_comments
    ADD CONSTRAINT support_ticket_comments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_api_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_api_key_id_fkey FOREIGN KEY (api_key_id) REFERENCES public.api_keys(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_related_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_related_request_id_fkey FOREIGN KEY (related_request_id) REFERENCES public.request_logs(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: telegram_bindings telegram_bindings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bindings
    ADD CONSTRAINT telegram_bindings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict K1pjMaNwdq8eHJNrVf62e9X9aQ5KsDammdMAlugjAWJ6re3rvMjhld3WRmMWvlj

